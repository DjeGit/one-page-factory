#!/usr/bin/env node
// Test de l'API AliExpress sur le serveur (rien n'est enregistré, aucune clé n'est affichée) :
//   node --env-file=.env.local scripts/aliexpress/probe.mjs <aliexpress_id> [fr|es|uk ...]
import { getCredentials, getProductForMarket, verifyAffiliateLink, callApi, MARKET_PARAMS, SIGN_VARIANTS } from './api.mjs';

const argv = process.argv.slice(2);
const variantsMode = argv.includes('--variants');
const [id, ...rest] = argv.filter((a) => !a.startsWith('--'));
if (!id || !/^\d{8,}$/.test(id)) {
  console.log('Usage : node --env-file=.env.local scripts/aliexpress/probe.mjs <aliexpress_id> [fr|es|uk ...]');
  process.exit(1);
}
const markets = rest.length ? rest : Object.keys(MARKET_PARAMS);

try {
  const c = getCredentials();
  const shape = (v) => `${v.length} car., ${/^\d+$/.test(v) ? 'chiffres' : /^[A-Za-z0-9]+$/.test(v) ? 'lettres/chiffres' : 'autres signes présents'}`;
  console.log(`Identifiants présents : clé ${c.appKey.slice(0, 3)}… (${shape(c.appKey)}), secret (${shape(c.appSecret)}), suivi ${c.trackingId}.`);
  if (variantsMode) {
    console.log('\nEssai des variantes de signature (même requête, une variante après l\'autre) :');
    for (const v of SIGN_VARIANTS) {
      try {
        await callApi('aliexpress.affiliate.productdetail.get', { product_ids: id, fields: 'sale_price', country: 'FR', target_currency: 'EUR', target_language: 'FR', tracking_id: c.trackingId }, { creds: c, signMethod: v.signMethod, timestampUnit: v.timestampUnit, extras: v.extras, gateway: v.gateway, transport: v.transport });
        console.log(`  ACCEPTÉE  ${v.name}`);
      } catch (e) {
        console.log(`  ${v.name} -> ${e.message.replace('API AliExpress : ', '').slice(0, 110)}`);
      }
    }
    process.exit(0);
  }
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
