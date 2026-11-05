#!/usr/bin/env node
// Où mène réellement le lien « Voir sur AliExpress » de chaque fiche ? Suit les redirections du lien affilié (sans ouvrir la page)
// depuis le serveur, avec la langue du marché de la fiche, et signale : mauvais produit, ou page imposant une autre langue / un autre pays.
//   node --env-file=.env.local scripts/aliexpress/check-landing.mjs                 (toutes les fiches ayant un lien AliExpress)
//   node --env-file=.env.local scripts/aliexpress/check-landing.mjs --slug <slug>   (une seule fiche)
//   node --env-file=.env.local scripts/aliexpress/check-landing.mjs --market fr     (un seul marché)
//   node --env-file=.env.local scripts/aliexpress/check-landing.mjs --verbose       (affiche toute la chaîne de redirections)
// Lecture seule : rien n'est modifié. Limite : le serveur n'a pas ton adresse IP ; AliExpress peut aussi adapter la page à la position
// du visiteur (un visiteur en Espagne voit souvent le site espagnol), ce que ce contrôle ne peut pas voir.
import { createClient } from '@supabase/supabase-js';
import { extractProductId } from './api.mjs';

const args = process.argv.slice(2);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const verbose = args.includes('--verbose');
const LANG = { fr: 'fr', es: 'es', uk: 'en' };
const ACCEPT = { fr: 'fr-FR,fr;q=0.9', es: 'es-ES,es;q=0.9', uk: 'en-GB,en;q=0.9' };
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

/** Langues / pays que l'adresse impose : sous-domaine (es.aliexpress.com), chemin (/es/), paramètres (lang=, locale=, shipTo=, country=). */
export function localeSignals(href) {
  const out = new Set();
  let u;
  try { u = new URL(href); } catch { return []; }
  const sub = u.hostname.match(/^([a-z]{2})\.aliexpress\.(?:com|us)$/);
  if (sub) out.add(sub[1]);
  const seg = u.pathname.match(/^\/(fr|es|en|uk|gb)(?:\/|$)/i);
  if (seg) out.add(seg[1].toLowerCase());
  for (const k of ['lang', 'locale', 'language', 'shipTo', 'shipCountry', 'country', 'region', 'site']) {
    const v = u.searchParams.get(k);
    const m = v && v.match(/^([a-z]{2})(?:[_-]([a-z]{2}))?$/i);
    if (m) out.add(m[1].toLowerCase()), m[2] && out.add(m[2].toLowerCase());
  }
  return [...out];
}

async function follow(link, market) {
  const trail = [];
  let url = link;
  for (let i = 0; i < 10; i++) {
    trail.push(url);
    const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': UA, 'accept-language': ACCEPT[market] || ACCEPT.fr }, signal: AbortSignal.timeout(20000) });
    const loc = res.headers.get('location');
    if (!loc || res.status < 300 || res.status >= 400) return { trail, status: res.status };
    url = new URL(loc, url).toString();
  }
  return { trail, status: 'trop de redirections' };
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
let q = sb.from('products').select('id, slug, market, active, aliexpress_id, affiliate_url').not('affiliate_url', 'is', null);
if (val('--slug')) q = q.eq('slug', val('--slug'));
if (val('--market')) q = q.eq('market', val('--market'));
const { data: rows, error } = await q.order('market').order('slug');
if (error) { console.error(error.message); process.exit(1); }
const list = rows.filter((r) => /aliexpress\.com/i.test(r.affiliate_url));
console.log(`${list.length} fiche(s) avec un lien AliExpress${rows.length !== list.length ? ` (${rows.length - list.length} autre(s) lien(s) ignoré(s))` : ''}\n`);

let bad = 0;
for (const r of list) {
  const want = LANG[r.market] || 'fr';
  try {
    const { trail, status } = await follow(r.affiliate_url, r.market);
    const final = trail[trail.length - 1];
    const id = trail.map(extractProductId).find(Boolean) || null;
    const signals = [...new Set(trail.flatMap(localeSignals))];
    const issues = [];
    if (r.aliexpress_id && id && String(id) !== String(r.aliexpress_id)) issues.push(`mauvais produit (${id} au lieu de ${r.aliexpress_id})`);
    if (!id) issues.push('identifiant produit introuvable dans la chaîne');
    const foreign = signals.filter((s) => !['aliexpress', want, ...(r.market === 'uk' ? ['gb', 'uk'] : [])].includes(s));
    if (foreign.length) issues.push(`la page impose : ${foreign.join(', ')} (marché de la fiche : ${r.market.toUpperCase()})`);
    if (status !== 200 && status !== 'trop de redirections' && !(typeof status === 'number' && status < 400)) issues.push(`réponse finale ${status}`);
    if (status === 'trop de redirections') issues.push(status);
    if (issues.length) bad++;
    let host = '?';
    try { host = new URL(final).host; } catch {}
    console.log(`${issues.length ? '✗' : '✓'} ${r.market.toUpperCase()} ${r.active ? 'EN LIGNE ' : 'brouillon'} ${r.slug}\n    → ${host} · produit ${id || '?'} · signaux de langue/pays : ${signals.join(', ') || 'aucun'}${issues.length ? '\n    ⚠ ' + issues.join(' ; ') : ''}`);
    if (verbose) trail.forEach((u, i) => console.log(`      ${i + 1}. ${u.slice(0, 200)}`));
  } catch (e) {
    bad++;
    console.log(`✗ ${r.market.toUpperCase()} ${r.slug}\n    ⚠ ${e.message}`);
  }
  await new Promise((r2) => setTimeout(r2, 400));
}
console.log(`\n${bad ? `${bad} fiche(s) à regarder` : 'Tout est cohérent'} sur ${list.length}.`);
process.exit(bad ? 1 : 0);
