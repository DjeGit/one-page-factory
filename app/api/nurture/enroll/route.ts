import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isValidMarket, MARKETS, type Market } from '@/lib/market';
import { isValidNurtureSequence, getNurtureListId, isNurtureConfiguredForMarket } from '@/lib/nurture/sequences';
import { upsertBrevoContact, isBrevoConfigured } from '@/lib/brevo/client';
import { badRequest, dbErrorResponse, isIsoDate, isUuid, readOptionalJsonObject, unauthorized } from '../../_lib/http';

interface EnrollFilters {
  market: Market | null;
  product_id: string | null;
  date_from: string | null;
  date_to: string | null;
}

/** Inscriptions traitées par appel : au-delà, le reste part au clic suivant (évite un délai d'attente dépassé). */
const MAX_PER_RUN = 500;
const CHUNK = 10;

type FilterResult = { filters: EnrollFilters } | { error: string };

/** Filtres vérifiés. Avant : un marché mal écrit était IGNORÉ, donc l'inscription visait TOUS les marchés. */
function parseFilters(input: { market?: unknown; product_id?: unknown; date_from?: unknown; date_to?: unknown }): FilterResult {
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const market = str(input.market);
  const productId = str(input.product_id);
  const from = str(input.date_from);
  const to = str(input.date_to);
  if (market && !isValidMarket(market)) return { error: 'Marché invalide (fr, es ou uk)' };
  if (productId && !isUuid(productId)) return { error: 'Produit invalide' };
  if (from && !isIsoDate(from.slice(0, 10))) return { error: 'Date de début invalide (AAAA-MM-JJ)' };
  if (to && !isIsoDate(to.slice(0, 10))) return { error: 'Date de fin invalide (AAAA-MM-JJ)' };
  return { filters: { market: market as Market | null, product_id: productId, date_from: from, date_to: to } };
}

// Requête commune GET (prévisualisation) / POST (inscription réelle) :
// leads (jamais les contacts manuels client/fournisseur), pas déjà inscrits
// ('none' — pas 'unsubscribed', pour ne jamais réinscrire quelqu'un qui
// s'est désinscrit), avec un email valide (une relance sans email n'a pas
// de sens), filtrés par marché/produit/date si fournis.
function baseQuery(sb: ReturnType<typeof getSupabaseAdmin>, filters: EnrollFilters, columns: string, head = false) {
  let query = sb
    .from('email_leads')
    .select(columns, head ? { count: 'exact', head: true } : { count: 'exact' })
    .eq('contact_type', 'lead')
    .eq('nurture_status', 'none')
    .not('email', 'is', null);
  if (filters.market) query = query.eq('market', filters.market);
  if (filters.product_id) query = query.eq('product_id', filters.product_id);
  if (filters.date_from) query = query.gte('created_at', filters.date_from);
  if (filters.date_to) {
    // Une date seule (« 2026-10-31 ») désigne la journée ENTIÈRE : avant, `<= minuit` excluait ce jour-là.
    if (/^\d{4}-\d{2}-\d{2}$/.test(filters.date_to)) {
      const next = new Date(`${filters.date_to}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      query = query.lt('created_at', next.toISOString().slice(0, 10));
    } else {
      query = query.lte('created_at', filters.date_to);
    }
  }
  return query;
}

// GET /api/nurture/enroll?market=&product_id=&date_from=&date_to= —
// prévisualisation : combien de leads seraient inscrits, sans rien inscrire.
export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const sp = req.nextUrl.searchParams;
  const parsed = parseFilters({ market: sp.get('market'), product_id: sp.get('product_id'), date_from: sp.get('date_from'), date_to: sp.get('date_to') });
  if ('error' in parsed) return badRequest(parsed.error);
  const sb = getSupabaseAdmin();

  // Un comptage par marché (requêtes « head », sans rapatrier les lignes) : avant, les leads étaient
  // tous chargés — et tronqués à 1000 par Supabase, ce qui faussait le total affiché.
  const markets = parsed.filters.market ? [parsed.filters.market] : MARKETS.map((m) => m.code);
  const counts = await Promise.all(
    markets.map(async (m) => {
      const { count, error } = await baseQuery(sb, { ...parsed.filters, market: m }, 'id', true);
      return { m, count: count ?? 0, error };
    })
  );
  const failed = counts.find((c) => c.error);
  if (failed?.error) return dbErrorResponse('GET /api/nurture/enroll', failed.error);

  const byMarket: Record<string, number> = {};
  for (const c of counts) if (c.count > 0) byMarket[c.m] = c.count;
  return NextResponse.json({
    count: counts.reduce((sum, c) => sum + c.count, 0),
    by_market: byMarket,
    brevo_configured: isBrevoConfigured(),
    markets_missing_list: MARKETS.filter((m) => !isNurtureConfiguredForMarket(m.code)).map((m) => m.code),
  });
}

// POST { market?, product_id?, date_from?, date_to?, sequence } — inscrit
// réellement les leads correspondants : ajoute chacun à la liste Brevo de
// relance de SON marché (jamais BREVO_LIST_ID_FR/ES/UK, voir
// lib/nurture/sequences.ts), puis marque nurture_status='enrolled' côté
// email_leads. N'envoie aucun email directement — Brevo pilote l'envoi via
// une automation branchée sur cette liste, exactement comme le suppose déjà
// le code de capture de leads pour la liste d'origine.
export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isBrevoConfigured()) return badRequest('BREVO_API_KEY non configurée');
  const parsedBody = await readOptionalJsonObject(req);
  if ('response' in parsedBody) return parsedBody.response;
  const body = parsedBody.body;
  const sequence = typeof body.sequence === 'string' ? body.sequence : '';
  if (!isValidNurtureSequence(sequence)) return badRequest('Séquence de relance invalide');

  const parsed = parseFilters(body);
  if ('error' in parsed) return badRequest(parsed.error);
  const sb = getSupabaseAdmin();

  // Seuls les marchés dotés d'une liste de relance sont traités : sinon les leads d'un marché sans liste
  // occuperaient indéfiniment les premières places du lot (ils restent « none »). Ils sont comptés à part.
  const configured = MARKETS.map((m) => m.code).filter((m) => isNurtureConfiguredForMarket(m));
  const candidates = parsed.filters.market ? configured.filter((m) => m === parsed.filters.market) : configured;

  let leads: unknown[] | null = [];
  let totalMatched: number | null = 0;
  if (candidates.length > 0) {
    const res = await baseQuery(sb, parsed.filters, 'id, email, market')
      .in('market', candidates)
      .order('created_at', { ascending: true })
      .limit(MAX_PER_RUN);
    if (res.error) return dbErrorResponse('POST /api/nurture/enroll', res.error);
    leads = res.data;
    totalMatched = res.count;
  }

  let enrolled = 0;
  let skippedNoList = 0;
  let failed = 0;
  if (candidates.length < (parsed.filters.market ? 1 : MARKETS.length)) {
    const all = await baseQuery(sb, parsed.filters, 'id', true);
    if (all.error) return dbErrorResponse('POST /api/nurture/enroll (comptage)', all.error);
    skippedNoList = Math.max(0, (all.count ?? 0) - (totalMatched ?? 0));
  }
  const rows = (leads || []) as unknown as { id: string; email: string; market: Market }[];

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const enrolledIds: string[] = [];
    await Promise.all(
      chunk.map(async (lead) => {
        const listId = getNurtureListId(lead.market);
        if (!listId) { skippedNoList++; return; }
        const result = await upsertBrevoContact({
          email: lead.email,
          listIds: [listId],
          attributes: { MARKET: lead.market.toUpperCase(), NURTURE_SEQUENCE: sequence },
        });
        if (result.ok) { enrolled++; enrolledIds.push(lead.id); } else { failed++; }
      })
    );
    // Marqué lot par lot : si le serveur s'interrompt en cours de route, les leads déjà inscrits chez
    // Brevo ne sont pas oubliés (avant : un seul marquage tout à la fin, en une requête à milliers d'identifiants).
    if (enrolledIds.length > 0) {
      const { error: markError } = await sb
        .from('email_leads')
        .update({ nurture_status: 'enrolled', nurture_sequence: sequence, nurture_enrolled_at: new Date().toISOString() })
        .in('id', enrolledIds);
      if (markError) console.error('[api] POST /api/nurture/enroll (marquage) :', markError.message);
    }
  }

  const matched = (totalMatched ?? rows.length) + skippedNoList;
  return NextResponse.json({
    enrolled,
    skipped_no_list: skippedNoList,
    failed,
    total_matched: matched,
    // Leads restant à traiter (plafond par appel) : relancer l'inscription pour continuer.
    remaining: Math.max(0, (totalMatched ?? rows.length) - enrolled - failed),
  });
}
