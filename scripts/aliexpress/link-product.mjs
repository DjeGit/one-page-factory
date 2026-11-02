#!/usr/bin/env node
// Génère et vérifie les liens affiliés d'un produit pour chaque marché où il existe, puis met à jour les fiches.
//   node --env-file=.env.local scripts/aliexpress/link-product.mjs <aliexpress_id>           (simulation : rien n'est écrit)
//   node --env-file=.env.local scripts/aliexpress/link-product.mjs <aliexpress_id> --apply   (enregistre liens, prix du jour, commission)
//   node --env-file=.env.local scripts/aliexpress/link-product.mjs --all [--apply]            (toutes les fiches dont le lien est encore neutre)
// Un lien n'est enregistré que s'il passe tous les contrôles (bon produit, bonne devise, prix cohérent).
import { createClient } from '@supabase/supabase-js';
import { getProductForMarket, verifyAffiliateLink, MARKET_PARAMS } from './api.mjs';
import { planUpdate } from './link.mjs';

const args = process.argv.slice(2);
const oneId = args.find((a) => /^\d{8,}$/.test(a));
const all = args.includes('--all');
const apply = args.includes('--apply');
if (!oneId && !all) {
  console.log('Usage : node --env-file=.env.local scripts/aliexpress/link-product.mjs <aliexpress_id> [--apply]   ou   --all [--apply]');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absentes (lancer avec --env-file=.env.local)');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });

let problems = 0;

async function linkOne(id) {
const { data: rows, error } = await supabase
  .from('products')
  .select('id, slug, market, price, price_currency, seller_name, commission_rate, affiliate_url, active')
  .eq('aliexpress_id', id);
if (error) throw error;
if (!rows.length) {
  console.log(`Aucune fiche avec aliexpress_id = ${id}. Lance d'abord la migration 20261102000001_products_aliexpress_id.sql.`);
  problems++;
  return;
}

console.log(`\n${apply ? 'ENREGISTREMENT' : 'SIMULATION'} — produit ${id}, ${rows.length} fiche(s)`);
for (const row of rows) {
  const market = row.market;
  console.log(`== ${market.toUpperCase()} — ${row.slug}`);
  if (!MARKET_PARAMS[market]) {
    console.log('  marché inconnu, ignoré');
    continue;
  }
  try {
    const detail = await getProductForMarket(id, market);
    const verification = detail
      ? await verifyAffiliateLink({ link: detail.promotionLink, detail, expected: { productId: id, currency: MARKET_PARAMS[market].currency, price: row.price ? Number(row.price) : undefined, tolerance: 0.4 } })
      : null;
    const plan = planUpdate(row, detail, verification, today);
    if (plan.action === 'update') {
      const p = plan.patch;
      console.log(`  OK — prix ${p.price} ${p.price_currency} (relevé du ${today}${row.price ? `, avant : ${row.price}` : ''}), commission ${p.commission_rate != null ? (p.commission_rate * 100).toFixed(1) + ' %' : 'inchangée'}`);
      if (apply) {
        const { error: e } = await supabase.from('products').update(p).eq('id', row.id);
        if (e) throw e;
        console.log('  fiche mise à jour');
      }
    } else {
      problems++;
      console.log(`  ${plan.action === 'unavailable' ? 'INDISPONIBLE' : 'BLOQUÉ'} — ${plan.reasons.join(' ; ')}`);
      console.log('  → la fiche garde son état (elle reste en brouillon : ce marché ne s\'affichera pas)');
    }
  } catch (e) {
    problems++;
    console.log(`  ERREUR : ${e.message}`);
  }
}
}

let ids = [oneId];
if (all) {
  const { data, error } = await supabase.from('products').select('aliexpress_id, affiliate_url').not('aliexpress_id', 'is', null);
  if (error) throw error;
  // Seules les fiches dont le lien est encore l'adresse neutre sont traitées.
  ids = [...new Set(data.filter((r) => /\/item\//.test(r.affiliate_url || '')).map((r) => r.aliexpress_id))];
  console.log(`${ids.length} produit(s) avec un lien encore neutre.`);
}
for (const id of ids) await linkOne(id);
console.log(problems ? `\n${problems} marché(s) à traiter.` : '\nTous les marchés sont prêts.');
