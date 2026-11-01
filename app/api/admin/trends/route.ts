import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { mondayOf, parseTrendCsv } from '@/lib/trends';

export const dynamic = 'force-dynamic';

/** GET : candidats de la semaine (la plus récente par défaut) + archive des refusés. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabaseAdmin();
  let week = req.nextUrl.searchParams.get('week');
  if (!week) {
    const { data } = await sb.from('trend_candidates').select('week').order('week', { ascending: false }).limit(1);
    week = data?.[0]?.week ?? mondayOf(new Date());
  }
  const [{ data: rows, error }, { data: archive }] = await Promise.all([
    sb.from('trend_candidates').select('*').eq('week', week)
      .order('category_slug').order('sales', { ascending: false, nullsFirst: false }),
    sb.from('trend_candidates').select('*').eq('decision', 'no').neq('week', week)
      .order('decided_at', { ascending: false, nullsFirst: false }).limit(500),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Produits de la semaine déjà refusés lors d'une recherche précédente.
  const refusedBefore: Record<string, string> = {};
  for (const a of archive ?? []) {
    if (!refusedBefore[a.aliexpress_id]) refusedBefore[a.aliexpress_id] = a.decided_at ?? a.week;
  }
  return NextResponse.json({ week, candidates: rows ?? [], archive: archive ?? [], refusedBefore });
}

/** PATCH : { ids: string[], decision: 'pending' | 'yes' | 'no' } — décision en lot. */
export async function PATCH(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
  const decision = body?.decision;
  if (!ids.length || !['pending', 'yes', 'no'].includes(decision)) {
    return NextResponse.json({ error: 'ids et decision requis' }, { status: 400 });
  }
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Remise en sélection d'un produit archivé (semaine précédente) : il rejoint la semaine en cours.
  if (decision === 'pending' && body?.restoreToWeek) {
    const week: string = body.restoreToWeek;
    const { data: old } = await sb.from('trend_candidates').select('*').in('id', ids);
    for (const o of old ?? []) {
      if (o.week === week) {
        await sb.from('trend_candidates').update({ decision: 'pending', decided_at: null, status: 'candidate', updated_at: now }).eq('id', o.id);
        continue;
      }
      const { data: same } = await sb.from('trend_candidates').select('id').eq('aliexpress_id', o.aliexpress_id).eq('week', week).maybeSingle();
      if (same) {
        await sb.from('trend_candidates').update({ decision: 'pending', decided_at: null, status: 'candidate', updated_at: now }).eq('id', same.id);
      } else {
        await sb.from('trend_candidates').update({ week, decision: 'pending', decided_at: null, status: 'candidate', updated_at: now }).eq('id', o.id);
      }
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
  const { error } = await sb.from('trend_candidates').update(patch).in('id', ids).in('status', ['candidate', 'validated', 'error']);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * POST : { csv: string, week?: string } — import d'un fichier (export de cette page, ou nouvelle recherche).
 * Crée ou met à jour les candidats de la semaine, applique la colonne OUI/NON si elle est remplie,
 * puis supprime les candidats NON décidés des semaines précédentes (les refusés restent archivés).
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.csv !== 'string') return NextResponse.json({ error: 'csv requis' }, { status: 400 });
  const week: string = typeof body.week === 'string' ? body.week : mondayOf(new Date());
  const { rows, errors } = parseTrendCsv(body.csv);
  if (!rows.length) return NextResponse.json({ error: errors[0] ?? 'Aucune ligne valide', errors }, { status: 400 });

  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;
  for (const r of rows) {
    const { data: existing } = await sb.from('trend_candidates').select('id, decision').eq('aliexpress_id', r.aliexpress_id).eq('week', week).maybeSingle();
    const fields = {
      category_slug: r.category_slug, name: r.name,
      price_fr: r.price_fr, price_es: r.price_es, price_uk: r.price_uk,
      commission_fr: r.commission_fr, commission_uk: r.commission_uk,
      rating: r.rating, reviews: r.reviews, sales: r.sales,
      url_fr: r.url_fr, url_uk: r.url_uk, updated_at: now,
    };
    const decisionPatch = r.decision
      ? { decision: r.decision, decided_at: now, status: r.decision === 'yes' ? 'validated' : 'candidate' }
      : {};
    if (existing) {
      await sb.from('trend_candidates').update({ ...fields, ...decisionPatch }).eq('id', existing.id);
      updated++;
    } else {
      await sb.from('trend_candidates').insert({ aliexpress_id: r.aliexpress_id, week, ...fields, ...decisionPatch });
      created++;
    }
  }
  // Nettoyage : candidats non décidés des semaines précédentes.
  const { count } = await sb.from('trend_candidates').delete({ count: 'exact' }).eq('decision', 'pending').lt('week', week);
  return NextResponse.json({ ok: true, week, created, updated, purged: count ?? 0, errors });
}
