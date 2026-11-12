import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { extractAliexpressId, mondayOf, parseTrendCsv, summarizeWeeks } from '@/lib/trends';
import { badRequest, dbErrorResponse, isIsoDate, isUuid, notFound, readJsonObject, unauthorized } from '../../_lib/http';

export const dynamic = 'force-dynamic';

const MAX_BATCH_IDS = 500;
const MAX_CSV_CHARS = 2_000_000;
const MAX_CSV_ROWS = 2000;
/** Statuts où un produit peut encore être (re)décidé ; au-delà il est en cours de traitement ou en ligne. */
const EDITABLE_STATUSES = ['candidate', 'validated', 'error'];

/** GET : candidats de la semaine (la plus récente par défaut) + archive des refusés. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const sb = getSupabaseAdmin();
  let week = req.nextUrl.searchParams.get('week');
  if (week && !isIsoDate(week)) return badRequest('Semaine invalide (format AAAA-MM-JJ)');
  if (!week) {
    const { data } = await sb.from('trend_candidates').select('week').order('week', { ascending: false }).limit(1);
    week = data?.[0]?.week ?? mondayOf(new Date());
  }
  const [{ data: rows, error }, { data: archive }, { data: weekRows }, { data: cats }] = await Promise.all([
    sb.from('trend_candidates').select('*').eq('week', week)
      .order('category_slug').order('sales', { ascending: false, nullsFirst: false }),
    sb.from('trend_candidates').select('*').eq('decision', 'no').neq('week', week)
      .order('decided_at', { ascending: false, nullsFirst: false }).limit(500),
    // Liste des semaines disponibles (choix de la semaine à l'écran) et icônes des catégories (comme la page Produits).
    sb.from('trend_candidates').select('week, decision').order('week', { ascending: false }).limit(5000),
    sb.from('categories').select('slug, icon'),
  ]);
  if (error) return dbErrorResponse('GET /api/admin/trends', error);
  // Produits de la semaine déjà refusés lors d'une recherche précédente.
  const refusedBefore: Record<string, string> = {};
  for (const a of archive ?? []) {
    if (!refusedBefore[a.aliexpress_id]) refusedBefore[a.aliexpress_id] = a.decided_at ?? a.week;
  }
  const weeks = summarizeWeeks((weekRows ?? []) as { week: string; decision: 'pending' | 'yes' | 'no' }[]);
  const icons: Record<string, string> = {};
  for (const c of cats ?? []) if (c.slug && c.icon) icons[c.slug] = c.icon;
  return NextResponse.json({ week, weeks, icons, candidates: rows ?? [], archive: archive ?? [], refusedBefore });
}

/** PATCH : { ids: string[], decision: 'pending' | 'yes' | 'no' } — décision en lot ; ou { id, shipping } — livraison gratuite relevée. */
export async function PATCH(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const parsed = await readJsonObject(req);
  if ('response' in parsed) return parsed.response;
  const body = parsed.body;

  // Livraison gratuite relevée à la main : { id, shipping: { fr?: 'Oui'|'Non'|null, es?, uk? } }
  if (body.shipping && typeof body.shipping === 'object' && typeof body.id === 'string') {
    if (!isUuid(body.id)) return badRequest('Identifiant invalide');
    const shipping = body.shipping as Record<string, unknown>;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const wanted: Record<string, boolean> = {};
    for (const m of ['fr', 'es', 'uk'] as const) {
      if (!(m in shipping)) continue;
      const v = shipping[m];
      if (v !== null && v !== 'Oui' && v !== 'Non') return badRequest('Valeur de livraison invalide');
      patch[`free_shipping_${m}`] = v;
      if (v !== null) wanted[m] = v === 'Oui';
    }
    const sb = getSupabaseAdmin();
    const { data: cand, error } = await sb.from('trend_candidates').update(patch).eq('id', body.id).select('*').maybeSingle();
    if (error) return dbErrorResponse('PATCH /api/admin/trends (livraison)', error);
    if (!cand) return notFound('Produit introuvable');
    // Les fiches déjà créées pour ce produit suivent aussitôt (même annonce, même pays).
    const results = await Promise.all(
      Object.entries(wanted).map(async ([m, free]) => {
        const itemId = extractAliexpressId(m === 'uk' ? cand.url_uk : cand.url_fr) ?? cand.aliexpress_id;
        const { error: e } = await sb.from('products').update({ free_shipping: free }).eq('aliexpress_id', itemId).eq('market', m);
        return e;
      }),
    );
    const failed = results.find(Boolean);
    // Avant : l'échec de la mise à jour des fiches était ignoré et la réponse restait « ok ».
    if (failed) return dbErrorResponse('PATCH /api/admin/trends (fiches produit)', failed);
    return NextResponse.json({ ok: true });
  }

  const ids: unknown[] = Array.isArray(body.ids) ? body.ids : [];
  const decision = body.decision;
  if (!ids.length || !['pending', 'yes', 'no'].includes(decision as string)) {
    return badRequest('ids et decision requis');
  }
  if (ids.length > MAX_BATCH_IDS) return badRequest(`${MAX_BATCH_IDS} produits maximum par opération`);
  if (!ids.every(isUuid)) return badRequest('Identifiant invalide dans la liste');
  const idList = ids as string[];
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Remise en sélection d'un produit archivé (semaine précédente) : il rejoint la semaine en cours.
  if (decision === 'pending' && body.restoreToWeek) {
    if (!isIsoDate(body.restoreToWeek)) return badRequest('Semaine invalide (format AAAA-MM-JJ)');
    const week: string = body.restoreToWeek;
    const { data: old, error: readError } = await sb.from('trend_candidates').select('*').in('id', idList);
    if (readError) return dbErrorResponse('PATCH /api/admin/trends (restauration, lecture)', readError);
    // Un seul passage pour savoir lesquels existent déjà dans la semaine visée (avant : une requête par produit).
    const { data: inWeek, error: weekError } = await sb
      .from('trend_candidates')
      .select('id, aliexpress_id')
      .eq('week', week)
      .in('aliexpress_id', (old ?? []).map((o) => o.aliexpress_id));
    if (weekError) return dbErrorResponse('PATCH /api/admin/trends (restauration, semaine)', weekError);
    const sameInWeek = new Map((inWeek ?? []).map((r) => [r.aliexpress_id as string, r.id as string]));
    const reset = { decision: 'pending', decided_at: null, status: 'candidate', updated_at: now };
    for (const o of old ?? []) {
      let res;
      if (o.week === week) res = await sb.from('trend_candidates').update(reset).eq('id', o.id);
      else if (sameInWeek.has(o.aliexpress_id)) res = await sb.from('trend_candidates').update(reset).eq('id', sameInWeek.get(o.aliexpress_id)!);
      else res = await sb.from('trend_candidates').update({ week, ...reset }).eq('id', o.id);
      if (res.error) return dbErrorResponse('PATCH /api/admin/trends (restauration)', res.error);
    }
    return NextResponse.json({ ok: true });
  }

  const patch: Record<string, unknown> = {
    decision,
    decided_at: decision === 'pending' ? null : now,
    updated_at: now,
  };
  if (decision === 'yes') patch.status = 'validated';
  else patch.status = 'candidate';
  // On ne retouche pas un produit déjà en cours de traitement ou en ligne.
  const { error } = await sb.from('trend_candidates').update(patch).in('id', idList).in('status', EDITABLE_STATUSES);
  if (error) return dbErrorResponse('PATCH /api/admin/trends', error);
  // Annulation d'un produit « prêt » avant sa mise en ligne automatique : NON ou attente le repasse en candidat.
  // Ses fiches restent en brouillon ; un nouveau OUI les réutilise.
  if (decision !== 'yes') {
    const { error: e2 } = await sb.from('trend_candidates').update({ ...patch, publish_at: null }).in('id', idList).eq('status', 'ready');
    if (e2) return dbErrorResponse('PATCH /api/admin/trends (annulation)', e2);
  }
  return NextResponse.json({ ok: true });
}

function int(v: number | null): number | null {
  return v == null || !Number.isFinite(v) ? null : Math.round(v);
}

/**
 * POST : { csv: string, week?: string } — import d'un fichier (export de cette page, ou nouvelle recherche).
 * Crée ou met à jour les candidats de la semaine, applique la colonne OUI/NON si elle est remplie,
 * puis supprime les candidats NON décidés des semaines précédentes (les refusés restent archivés).
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const parsedBody = await readJsonObject(req);
  if ('response' in parsedBody) return parsedBody.response;
  const body = parsedBody.body;
  if (typeof body.csv !== 'string') return badRequest('csv requis');
  if (body.csv.length > MAX_CSV_CHARS) return badRequest('Fichier trop volumineux (2 Mo maximum)');

  // La semaine est toujours un lundi, jamais dans le futur lointain : une date fantaisiste
  // (ex. 2099) déclencherait la purge de TOUS les candidats non décidés plus bas.
  const currentMonday = mondayOf(new Date());
  let week = currentMonday;
  if (body.week !== undefined) {
    if (!isIsoDate(body.week) || mondayOf(new Date(`${body.week}T00:00:00Z`)) !== body.week) {
      return badRequest('Semaine invalide : indiquez le lundi de la semaine (AAAA-MM-JJ)');
    }
    if (body.week > currentMonday) return badRequest('La semaine ne peut pas être dans le futur');
    week = body.week;
  }

  const { rows: allRows, errors } = parseTrendCsv(body.csv);
  if (!allRows.length) return badRequest(errors[0] ?? 'Aucune ligne valide');
  if (allRows.length > MAX_CSV_ROWS) return badRequest(`${MAX_CSV_ROWS} lignes maximum par import`);
  // Un même produit deux fois dans le fichier : la dernière ligne l'emporte (sinon conflit d'unicité).
  const rows = Array.from(new Map(allRows.map((r) => [r.aliexpress_id, r])).values());

  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Produits déjà présents cette semaine : UNE requête (avant : une requête par ligne du fichier).
  const { data: existingRows, error: existingError } = await sb
    .from('trend_candidates')
    .select('id, aliexpress_id, status')
    .eq('week', week)
    .in('aliexpress_id', rows.map((r) => r.aliexpress_id));
  if (existingError) return dbErrorResponse('POST /api/admin/trends (lecture)', existingError);
  const existingById = new Map((existingRows ?? []).map((e) => [e.aliexpress_id as string, e as { id: string; status: string }]));

  let created = 0;
  let updated = 0;
  const failures: string[] = [];

  const handle = async (r: (typeof rows)[number]) => {
    const fields = {
      category_slug: r.category_slug, name: r.name,
      price_fr: r.price_fr, price_es: r.price_es, price_uk: r.price_uk,
      commission_fr: r.commission_fr, commission_uk: r.commission_uk,
      rating: r.rating, reviews: int(r.reviews), sales: int(r.sales),
      url_fr: r.url_fr, url_uk: r.url_uk, updated_at: now,
    };
    const existing = existingById.get(r.aliexpress_id);
    // La décision du fichier ne s'applique pas à un produit déjà en cours de traitement ou en ligne
    // (même règle que la décision manuelle) : sinon un réimport d'export le remettrait « validé »
    // et le flux automatique le retraiterait.
    const decisionPatch = r.decision && (!existing || EDITABLE_STATUSES.includes(existing.status))
      ? { decision: r.decision, decided_at: now, status: r.decision === 'yes' ? 'validated' : 'candidate' }
      : {};
    if (existing) {
      const { error } = await sb.from('trend_candidates').update({ ...fields, ...decisionPatch }).eq('id', existing.id);
      if (error) failures.push(r.name || r.aliexpress_id); else updated++;
    } else {
      const { error } = await sb.from('trend_candidates').insert({ aliexpress_id: r.aliexpress_id, week, ...fields, ...decisionPatch });
      if (error) failures.push(r.name || r.aliexpress_id); else created++;
    }
  };
  // Par lots de 10 en parallèle (avant : une ligne après l'autre).
  for (let i = 0; i < rows.length; i += 10) {
    await Promise.all(rows.slice(i, i + 10).map(handle));
  }
  if (failures.length) console.error('[api] POST /api/admin/trends : lignes en échec :', failures.join(' | '));
  if (failures.length === rows.length) {
    return NextResponse.json({ error: "Aucune ligne n'a pu être enregistrée.", errors }, { status: 500 });
  }

  // Nettoyage : candidats non décidés des semaines précédentes.
  const { count, error: purgeError } = await sb.from('trend_candidates').delete({ count: 'exact' }).eq('decision', 'pending').lt('week', week);
  if (purgeError) console.error('[api] POST /api/admin/trends (purge) :', purgeError.message);
  return NextResponse.json({
    ok: failures.length === 0,
    week, created, updated, purged: count ?? 0,
    errors: failures.length ? [...errors, ...failures.map((n) => `Échec d'enregistrement : ${n}`)] : errors,
  });
}
