#!/usr/bin/env node
// Diagnostic : la page produit AliExpress expose-t-elle les caractéristiques depuis le serveur ?
//   node --env-file=.env.local scripts/pipeline/specs-probe.mjs <aliexpress_id>
import { extractSpecs, fetchItemHtml, specKeyNames } from './specs.mjs';

const id = process.argv[2];
if (!id) {
  console.log('Usage : node scripts/pipeline/specs-probe.mjs <aliexpress_id>');
  process.exit(1);
}
try {
  const html = await fetchItemHtml(id);
  console.log(`Page lue : ${Math.round(html.length / 1024)} Ko`);
  const specs = extractSpecs(html);
  console.log(`Caractéristiques trouvées : ${specs.length}`);
  for (const s of specs.slice(0, 40)) console.log(`  ${s.name} : ${s.value}`);
  if (!specs.length) {
    console.log(`Clés JSON proches : ${specKeyNames(html).join(', ') || 'aucune'}`);
    const i = html.search(/attrName|productProp|specs?Module|"Specifications"/i);
    console.log(i >= 0 ? `Extrait autour de la 1re occurrence :\n${html.slice(Math.max(0, i - 100), i + 700)}` : 'Aucune occurrence de attrName / productProp / specsModule / Specifications.');
  }
} catch (e) {
  console.log(`Échec : ${e.message}`);
}
