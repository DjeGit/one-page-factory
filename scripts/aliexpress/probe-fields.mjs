#!/usr/bin/env node
// Diagnostic « livraison » : quels champs l'API AliExpress renvoie-t-elle vraiment pour un produit ?
// (rien n'est enregistré, aucune clé n'est affichée)
//   node --env-file=.env.local scripts/aliexpress/probe-fields.mjs <aliexpress_id> [fr|es|uk]
import { getCredentials, callApi, MARKET_PARAMS } from './api.mjs';

const [id, market = 'fr'] = process.argv.slice(2);
if (!id || !/^\d{8,}$/.test(id) || !MARKET_PARAMS[market]) {
  console.log('Usage : node --env-file=.env.local scripts/aliexpress/probe-fields.mjs <aliexpress_id> [fr|es|uk]');
  process.exit(1);
}

const SHIP = /ship|deliver|freight|logist|fee|postage|free/i;
const m = MARKET_PARAMS[market];
const c = getCredentials();

function show(label, product) {
  const keys = Object.keys(product || {});
  console.log(`\n== ${label} ==`);
  console.log(`${keys.length} champs : ${keys.join(', ')}`);
  const hits = keys.filter((k) => SHIP.test(k));
  if (hits.length) for (const k of hits) console.log(`  >>> ${k} = ${JSON.stringify(product[k])}`);
  else console.log('  (aucun champ de livraison)');
}

const firstProduct = (json, root) => {
  const p = json?.[root]?.resp_result?.result?.products?.product;
  return Array.isArray(p) ? p[0] : p;
};

async function tryCall(label, method, params, root) {
  try {
    const json = await callApi(method, params, { creds: c });
    const p = firstProduct(json, root);
    if (!p) {
      const r = json?.[root]?.resp_result;
      console.log(`\n== ${label} ==\nréponse sans produit (code ${r?.resp_code} ${r?.resp_msg || ''})`);
      return null;
    }
    show(label, p);
    return p;
  } catch (e) {
    console.log(`\n== ${label} ==\nERREUR : ${e.message}`);
    return null;
  }
}

const base = { product_ids: id, country: m.country, target_currency: m.currency, target_language: m.language, tracking_id: c.trackingId };
const detail = await tryCall('productdetail.get, champs par défaut', 'aliexpress.affiliate.productdetail.get', base, 'aliexpress_affiliate_productdetail_get_response');
await tryCall(
  'productdetail.get, champs de livraison demandés',
  'aliexpress.affiliate.productdetail.get',
  { ...base, fields: 'sale_price,ship_to_days,delivery_days,shipping_fee,free_shipping,logistics_info_dto' },
  'aliexpress_affiliate_productdetail_get_response'
);

const words = String(detail?.product_title || '').split(/\s+/).slice(0, 5).join(' ');
if (words) {
  await tryCall(
    `product.query (mots-clés « ${words} »)`,
    'aliexpress.affiliate.product.query',
    { keywords: words, ship_to_country: m.country, target_currency: m.currency, target_language: m.language, tracking_id: c.trackingId, page_size: '5', fields: 'ship_to_days,sale_price,product_title' },
    'aliexpress_affiliate_product_query_response'
  );
}
