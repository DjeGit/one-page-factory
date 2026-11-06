#!/usr/bin/env node
// Quelles fiches n'ont pas (assez) de photos, et pourquoi ? Lecture seule.
//   node --env-file=.env.local scripts/pipeline/photo-audit.mjs
//   node --env-file=.env.local scripts/pipeline/photo-audit.mjs --json    (liste brute, à me renvoyer)
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const json = process.argv.includes('--json');
const need = (r) => { if (r.error) { console.error(r.error.message); process.exit(1); } return r.data || []; };

const products = need(await sb.from('products').select('id, slug, market, active, aliexpress_id, image_url, images, created_at').order('created_at', { ascending: false }).limit(2000));
const cands = need(await sb.from('trend_candidates').select('aliexpress_id, week, name, status, decision, photos_status, photos, image_urls, photos_report, error').order('week', { ascending: false }).limit(2000));
const byAe = new Map();
for (const c of cands) if (!byAe.has(c.aliexpress_id)) byAe.set(c.aliexpress_id, c);

const count = (p) => (Array.isArray(p.images) ? p.images.filter(Boolean).length : 0) || (p.image_url ? 1 : 0);
const rows = products
  .filter((p) => count(p) < 3)
  .map((p) => {
    const c = p.aliexpress_id ? byAe.get(p.aliexpress_id) : null;
    const rep = c?.photos_report || {};
    let cause;
    if (!p.aliexpress_id) cause = 'fiche sans aliexpress_id (créée à la main ou avant le worker)';
    else if (!c) cause = 'produit absent de la page Tendance';
    else if (c.photos_status === 'error') cause = `tri photos en échec : ${String(rep.error || c.error || '?').slice(0, 110)}`;
    else if (c.photos_status === 'none') cause = `photos jamais traitées (statut produit : ${c.status}, décision : ${c.decision})`;
    else if (['review', 'approved', 'attached'].includes(c.photos_status)) cause = `photos triées (${(c.photos || []).length}) mais pas copiées dans la fiche`;
    else cause = `statut photos : ${c.photos_status}`;
    return { slug: p.slug, market: p.market, active: p.active, photos: count(p), source_urls: c?.image_urls?.length ?? null, candidate_status: c?.status ?? null, cause };
  });

if (json) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
const live = rows.filter((r) => r.active);
console.log(`${products.length} fiches au total · ${rows.length} avec moins de 3 photos (dont ${live.length} EN LIGNE)\n`);
const groups = {};
for (const r of rows) (groups[r.cause.replace(/\(\d+\)|\d+/g, 'n').slice(0, 70)] ||= []).push(r);
for (const [k, list] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`— ${list.length} × ${list[0].cause.slice(0, 140)}`);
  for (const r of list.slice(0, 6)) console.log(`     ${r.active ? 'EN LIGNE' : 'brouillon'} ${r.market.toUpperCase()} ${r.photos} photo(s), ${r.source_urls ?? '?'} image(s) source — ${r.slug}`);
  if (list.length > 6) console.log(`     … et ${list.length - 6} autre(s)`);
}
