import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isValidMarket, MARKETS, type Market } from '@/lib/market';
import { isValidNurtureSequence, getNurtureListId, isNurtureConfiguredForMarket } from '@/lib/nurture/sequences';
import { upsertBrevoContact, isBrevoConfigured } from '@/lib/brevo/client';

interface EnrollFilters {
  market: string | null;
  product_id: string | null;
  date_from: string | null;
  date_to: string | null;
}

function readFilters(searchParams: URLSearchParams): EnrollFilters {
  return {
    market: searchParams.get('market'),
    product_id: searchParams.get('product_id'),
    date_from: searchParams.get('date_from'),
    date_to: searchParams.get('date_to'),
  };
}

// Requête commune GET (prévisualisation) / POST (inscription réelle) :
// leads (jamais les contacts manuels client/fournisseur), pas déjà inscrits
// ('none' — pas 'unsubscribed', pour ne jamais réinscrire quelqu'un qui
// s'est désinscrit), avec un email valide (une relance sans email n'a pas
// de sens), filtrés par marché/produit/date si fournis.
function buildQuery(sb: ReturnType<typeof getSupabaseAdmin>, filters: EnrollFilters) {
  let query = sb
    .from('email_leads')
    .select('id, email, market')
    .eq('contact_type', 'lead')
    .eq('nurture_status', 'none')
    .not('email', 'is', null);
  if (filters.market && isValidMarket(filters.market)) query = query.eq('market', filters.market);
  if (filters.product_id) query = query.eq('product_id', filters.product_id);
  if (filters.date_from) query = query.gte('created_at', filters.date_from);
  if (filters.date_to) query = query.lte('created_at', filters.date_to);
  return query;
}

// GET /api/nurture/enroll?market=&product_id=&date_from=&date_to= —
// prévisualisation : combien de leads seraient inscrits, sans rien inscrire.
export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const filters = readFilters(req.nextUrl.searchParams);
  const { data, error } = await buildQuery(sb, filters);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const byMarket: Record<string, number> = {};
  for (const lead of data || []) {
    const m = (lead as { market: string }).market;
    byMarket[m] = (byMarket[m] || 0) + 1;
  }
  return NextResponse.json({
    count: data?.length ?? 0,
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
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isBrevoConfigured()) {
    return NextResponse.json({ error: 'BREVO_API_KEY non configurée' }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const sequence = typeof body.sequence === 'string' ? body.sequence : '';
  if (!isValidNurtureSequence(sequence)) {
    return NextResponse.json({ error: 'Séquence de relance invalide' }, { status: 400 });
  }
  const sb = getSupabaseAdmin();
  const filters: EnrollFilters = {
    market: typeof body.market === 'string' ? body.market : null,
    product_id: typeof body.product_id === 'string' ? body.product_id : null,
    date_from: typeof body.date_from === 'string' ? body.date_from : null,
    date_to: typeof body.date_to === 'string' ? body.date_to : null,
  };
  const { data: leads, error } = await buildQuery(sb, filters);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let enrolled = 0;
  let skippedNoList = 0;
  let failed = 0;
  const enrolledIds: string[] = [];

  for (const lead of (leads || []) as { id: string; email: string; market: Market }[]) {
    const listId = getNurtureListId(lead.market);
    if (!listId) { skippedNoList++; continue; }
    const result = await upsertBrevoContact({
      email: lead.email,
      listIds: [listId],
      attributes: { MARKET: lead.market.toUpperCase(), NURTURE_SEQUENCE: sequence },
    });
    if (result.ok) { enrolled++; enrolledIds.push(lead.id); } else { failed++; }
  }

  if (enrolledIds.length > 0) {
    await sb
      .from('email_leads')
      .update({ nurture_status: 'enrolled', nurture_sequence: sequence, nurture_enrolled_at: new Date().toISOString() })
      .in('id', enrolledIds);
  }

  return NextResponse.json({ enrolled, skipped_no_list: skippedNoList, failed, total_matched: leads?.length ?? 0 });
}
