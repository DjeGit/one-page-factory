#!/usr/bin/env node
// Relevé « livraison gratuite » : AliExpress n'indique pas la livraison dans son API, elle n'est lisible que sur la page
// produit (selon le pays de livraison). Le relevé se fait donc pendant la recherche de la semaine, une fois pour toutes :
//   1) lister les produits de la semaine et leurs pages à regarder :
//        node --env-file=.env.local scripts/pipeline/shipping.mjs list [--week 2026-11-02] [--missing]
//   2) enregistrer ce qui a été relevé (1 = livraison gratuite, 0 = payante, ? = pas relevé), en une seule commande :
//        node --env-file=.env.local scripts/pipeline/shipping.mjs apply 1005007345056908=fr:1,es:1,uk:0 1005010428515910=fr:0,es:0
//      → écrit « Oui » / « Non » dans la page Tendance de la semaine (trend_candidates.free_shipping_*), que le worker
//        reprend pour créer les fiches, et met aussi à jour les fiches déjà créées pour ce produit.
//        (--candidates-only : ne touche pas aux fiches existantes)

import { fileURLToPath } from 'node:url';
import { itemIdFor } from './offers.mjs';

export const MARKETS = ['fr', 'es', 'uk'];

export const shippingUrl = (id) => `https://www.aliexpress.com/item/${id}.html`;

const has = (v) => v != null && String(v).trim() !== '';

/** `1005007345056908=fr:1,es:0,uk:?` → { id, values: { fr: true, es: false } } (les « ? » sont ignorés). */
export function parseEntry(arg) {
  const m = String(arg || '').trim().match(/^(\d{6,})=(.+)$/);
  if (!m) throw new Error(`Entrée illisible : « ${arg} » (attendu : 1005007345056908=fr:1,es:0,uk:1)`);
  const values = {};
  for (const part of m[2].split(',')) {
    const p = part.trim().match(/^(fr|es|uk):\s*([01?])$/i);
    if (!p) throw new Error(`Pays ou valeur illisible dans « ${arg} » : « ${part.trim()} » (attendu fr:1, es:0, uk:?)`);
    if (p[2] === '?') continue;
    values[p[1].toLowerCase()] = p[2] === '1';
  }
  if (!Object.keys(values).length) throw new Error(`Aucune valeur relevée dans « ${arg} »`);
  return { id: m[1], values };
}

export const label = (b) => (b ? 'Oui' : 'Non');

const unavailableUk = (c) => !c.url_uk && c.price_uk == null;

/** Produits d'une semaine (la dernière par défaut) avec, pour chaque pays, la page à ouvrir et la valeur déjà connue. */
export async function listShipping(sb, { week, missingOnly = false } = {}) {
  let w = week;
  if (!w) {
    const { data, error } = await sb.from('trend_candidates').select('week').order('week', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return { week: null, rows: [] };
    w = data.week;
  }
  const { data, error } = await sb.from('trend_candidates').select('*').eq('week', w).order('created_at');
  if (error) throw error;
  const rows = [];
  for (const c of data || []) {
    const markets = MARKETS.filter((m) => !(m === 'uk' && unavailableUk(c))).map((m) => ({
      market: m, itemId: itemIdFor(c, m), url: shippingUrl(itemIdFor(c, m)), current: has(c[`free_shipping_${m}`]) ? String(c[`free_shipping_${m}`]) : null,
    }));
    if (missingOnly && markets.every((x) => x.current)) continue;
    rows.push({ id: c.id, aliexpressId: c.aliexpress_id, name: c.name, decision: c.decision ?? null, status: c.status ?? null, markets });
  }
  return { week: w, rows };
}

export function formatList({ week, rows }) {
  if (!rows.length) return week ? `Semaine ${week} : rien à relever.` : 'Aucune semaine trouvée dans Tendance de la semaine.';
  const out = [`Semaine ${week} — ${rows.length} produit(s) à relever (livraison gratuite ? 1 = oui, 0 = non)\n`];
  for (const r of rows) {
    out.push(`${r.aliexpressId} — ${r.name}${r.decision ? ` [décision : ${r.decision}]` : ''}`);
    for (const m of r.markets) out.push(`   ${m.market.toUpperCase()} : ${m.url}   (actuel : ${m.current ?? 'non relevé'})`);
    out.push(`   → ${r.aliexpressId}=${r.markets.map((m) => `${m.market}:?`).join(',')}`);
  }
  return out.join('\n');
}

/**
 * Enregistre le relevé. Retourne un compte rendu par produit.
 * @param {{id:string, values:Record<string,boolean>}[]} entries
 */
export async function applyShipping(sb, entries, { updateProducts = true, log = () => {} } = {}) {
  const report = [];
  for (const e of entries) {
    const { data: rows, error } = await sb.from('trend_candidates').select('*').eq('aliexpress_id', e.id);
    if (error) throw error;
    if (!rows?.length) {
      log(`✗ ${e.id} : produit introuvable dans Tendance de la semaine`);
      report.push({ id: e.id, found: false, candidates: 0, products: 0 });
      continue;
    }
    const patch = {};
    for (const [m, v] of Object.entries(e.values)) patch[`free_shipping_${m}`] = label(v);
    for (const c of rows) {
      const { error: upErr } = await sb.from('trend_candidates').update(patch).eq('id', c.id);
      if (upErr) throw upErr;
    }
    let products = 0;
    if (updateProducts) {
      for (const [m, v] of Object.entries(e.values)) {
        const itemId = itemIdFor(rows[0], m);
        const { data: hit, error: pErr } = await sb.from('products').update({ free_shipping: v }).eq('aliexpress_id', itemId).eq('market', m).select('id');
        if (pErr) throw pErr;
        products += hit?.length || 0;
      }
    }
    log(`✓ ${e.id} — ${rows[0].name} : ${Object.entries(e.values).map(([m, v]) => `${m.toUpperCase()} ${label(v)}`).join(', ')}${updateProducts ? ` (${products} fiche(s) mise(s) à jour)` : ''}`);
    report.push({ id: e.id, found: true, candidates: rows.length, products });
  }
  return report;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!['list', 'apply'].includes(cmd)) {
    console.log('Usage :\n  shipping.mjs list [--week AAAA-MM-JJ] [--missing]\n  shipping.mjs apply <id>=fr:1,es:0,uk:? [...] [--candidates-only]');
    process.exit(1);
  }
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absentes (lancer avec --env-file=.env.local)');
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  if (cmd === 'list') {
    const i = rest.indexOf('--week');
    console.log(formatList(await listShipping(sb, { week: i >= 0 ? rest[i + 1] : undefined, missingOnly: rest.includes('--missing') })));
    return;
  }
  const entries = rest.filter((a) => !a.startsWith('--')).map(parseEntry);
  if (!entries.length) throw new Error('Rien à enregistrer (exemple : 1005007345056908=fr:1,es:1,uk:0)');
  await applyShipping(sb, entries, { updateProducts: !rest.includes('--candidates-only'), log: (m) => console.log(m) });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
