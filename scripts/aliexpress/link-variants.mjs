#!/usr/bin/env node
// Essai : quelle forme de lien affilié garde un visiteur FRANÇAIS sur la version française d'AliExpress, où qu'il se trouve ?
//   node --env-file=.env.local scripts/aliexpress/link-variants.mjs <aliexpress_id> [fr|es]
// Génère, par l'API officielle, plusieurs liens affiliés pour le même produit (adresse de départ différente), puis suit leurs redirections.
// Rien n'est enregistré. Ouvre ensuite chaque lien dans ton navigateur (bloqueur de pub désactivé) et note celui qui affiche
// la langue française, l'euro et la livraison vers la France. Les paramètres d'adresse ci-dessous sont des hypothèses à tester,
// pas des garanties : AliExpress choisit surtout la langue / le pays avec des cookies et la position du visiteur.
import { generateLink, getProductForMarket, extractProductId } from './api.mjs';

const id = process.argv.slice(2).find((a) => /^\d{8,}$/.test(a));
const market = process.argv.slice(2).find((a) => ['fr', 'es'].includes(a)) || 'fr';
if (!id) { console.log('Usage : node --env-file=.env.local scripts/aliexpress/link-variants.mjs <aliexpress_id> [fr|es]'); process.exit(1); }

const M = { fr: { sub: 'fr', gw: 'glo2fra', country: 'FR', lang: 'fr', cur: 'EUR' }, es: { sub: 'es', gw: 'glo2esp', country: 'ES', lang: 'es', cur: 'EUR' } }[market];
const variants = [
  ['A · sous-domaine de la langue', `https://${M.sub}.aliexpress.com/item/${id}.html`],
  ['B · site mondial + gatewayAdapt', `https://www.aliexpress.com/item/${id}.html?gatewayAdapt=${M.gw}`],
  ['C · sous-domaine + gatewayAdapt', `https://${M.sub}.aliexpress.com/item/${id}.html?gatewayAdapt=${M.gw}`],
  ['D · site mondial + pays, langue et devise', `https://www.aliexpress.com/item/${id}.html?shipTo=${M.country}&language=${M.lang}&currency=${M.cur}`],
];

async function follow(link) {
  const trail = [];
  let url = link;
  for (let i = 0; i < 10; i++) {
    trail.push(url);
    const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', 'accept-language': M.lang }, signal: AbortSignal.timeout(20000) });
    const loc = res.headers.get('location');
    if (!loc || res.status < 300 || res.status >= 400) break;
    url = new URL(loc, url).toString();
  }
  return trail;
}
const show = async (label, link) => {
  console.log(`\n${label}\n  lien à tester : ${link}`);
  try {
    const trail = await follow(link);
    const last = trail[trail.length - 1];
    const u = new URL(last);
    console.log(`  atterrit sur : ${u.host}${u.pathname} (produit ${trail.map(extractProductId).find(Boolean) || '?'})${u.search ? `\n  paramètres : ${u.search.slice(0, 160)}` : ''}`);
  } catch (e) { console.log(`  suivi impossible : ${e.message}`); }
};

console.log(`Produit ${id} — marché ${market.toUpperCase()}`);
const current = await getProductForMarket(id, market);
await show('0 · lien actuel des fiches (référence)', current?.promotionLink || '(aucun)');
for (const [label, src] of variants) {
  try {
    const link = await generateLink(src);
    await show(`${label}\n  adresse de départ : ${src}`, link || '(l\'API n\'a pas renvoyé de lien)');
  } catch (e) { console.log(`\n${label}\n  ✗ ${e.message}`); }
}
console.log('\nOuvre chaque lien dans ton navigateur et note : langue de la page, devise, pays de livraison.');
