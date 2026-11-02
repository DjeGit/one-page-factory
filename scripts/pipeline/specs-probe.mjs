#!/usr/bin/env node
// Diagnostic : la page produit AliExpress expose-t-elle les caractéristiques depuis le serveur ?
//   node --env-file=.env.local scripts/pipeline/specs-probe.mjs <aliexpress_id>
import { extractSpecs, fetchItemHtml, specKeyNames } from './specs.mjs';

const id = process.argv[2];
if (!id) {
  console.log('Usage : node scripts/pipeline/specs-probe.mjs <aliexpress_id>');
  process.exit(1);
}
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
try {
  const html = await fetchItemHtml(id);
  console.log(`Page lue : ${Math.round(html.length / 1024)} Ko`);
  const specs = extractSpecs(html);
  console.log(`Caractéristiques trouvées : ${specs.length}`);
  for (const s of specs.slice(0, 40)) console.log(`  ${s.name} : ${s.value}`);
  if (!specs.length) {
    console.log(`Clés proches (Prop/Spec/Attr) : ${specKeyNames(html).join(', ') || 'aucune'}`);
    const keys = [...new Set([...html.matchAll(/"([A-Za-z][A-Za-z0-9_]{3,40})"\s*:/g)].map((m) => m[1]))];
    console.log(`Clés JSON de la page (${keys.length}) : ${keys.slice(0, 160).join(', ')}`);
    const t = html.match(/<title>([^<]*)<\/title>/i);
    console.log(`Titre : ${t ? t[1].slice(0, 120) : 'absent'}`);
    for (const w of ['Brand', 'Battery', 'Voltage', 'Material', 'Origin', 'Specification', 'Description', 'window.runParams', '_d_c_', 'captcha', 'punish']) {
      const i = html.indexOf(w);
      console.log(`  « ${w} » : ${i >= 0 ? `trouvé vers ${i} → ${html.slice(Math.max(0, i - 40), i + 140).replace(/\s+/g, ' ')}` : 'absent'}`);
    }
    const d = html.match(/"descriptionUrl"\s*:\s*"([^"]+)"/);
    if (d) {
      const url = d[1].replace(/\\\//g, '/');
      console.log(`descriptionUrl : ${url}`);
      const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
      const dh = await r.text();
      const text = dh.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`Description : HTTP ${r.status}, ${dh.length} octets, ${text.length} caractères de texte`);
      if (text) console.log(`  ${text.slice(0, 700)}`);
    } else {
      console.log('descriptionUrl : absent');
    }
  }
} catch (e) {
  console.log(`Échec : ${e.message}`);
}
