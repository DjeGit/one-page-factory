#!/usr/bin/env node
// Test de l'API AliExpress sur le serveur (rien n'est enregistré, aucune clé n'est affichée) :
//   node --env-file=.env.local scripts/aliexpress/probe.mjs <aliexpress_id> [fr|es|uk ...]
import { getCredentials, getProductForMarket, verifyAffiliateLink, MARKET_PARAMS } from './api.mjs';

const [id, ...rest] = process.argv.slice(2);
if (!id || !/^\d{8,}$/.test(id)) {
  console.log('Usage : node --env-file=.env.local scripts/aliexpress/probe.mjs <aliexpress_id> [fr|es|uk ...]');
  process.exit(1);
}
const markets = rest.length ? rest : Object.keys(MARKET_PARAMS);

try {
  const c = getCredentials();
  console.log(`Identifiants présents (clé ${c.appKey.slice(0, 3)}…, suivi ${c.trackingId}).`);
} catch (e) {
  console.log(`ERREUR : ${e.message}`);
  process.exit(1);
}

for (const market of markets) {
  console.log(`\n== ${market.toUpperCase()} ==`);
  try {
    const d = await getProductForMarket(id, market);
    if (!d) {
      console.log('Produit introuvable pour ce pays (ou hors programme affilié).');
      continue;
    }
    console.log(`${d.title?.slice(0, 80)}`);
    console.log(`prix ${d.price} ${d.currency} (barré ${d.originalPrice ?? '-'}), commission ${d.commissionRate != null ? (d.commissionRate * 100).toFixed(1) + ' %' : '?'}, vendeur ${d.shopName || '?'}, note ${d.ratingPercent ?? '?'} %, ventes ${d.sales ?? '?'}`);
    console.log(`photos ${d.images.length}, vidéo ${d.videoUrl ? 'oui' : 'non'}`);
    console.log(`lien : ${d.promotionLink}`);
    const v = await verifyAffiliateLink({ link: d.promotionLink, detail: d, expected: { productId: id, currency: MARKET_PARAMS[market].currency } });
    for (const k of v.checks) console.log(`  ${k.ok ? 'OK ' : 'ÉCHEC'} ${k.name} — ${k.detail}`);
    console.log(v.ok ? '  => lien vérifié' : '  => lien NON vérifié');
  } catch (e) {
    console.log(`ERREUR : ${e.message}`);
  }
}
