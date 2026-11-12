#!/usr/bin/env node
// Rattrapage des vidéos YouTube : cherche une vidéo pour les fiches qui n'en ont pas (le worker ne cherche qu'à la création de la fiche).
// À lancer une fois par semaine, après la recherche des tendances :
//   45 4 * * 1   /var/www/one-page-factory/pipeline-cron.sh video-backfill >> /var/log/opf-video.log 2>&1
// À la main (depuis le dossier du projet) :
//   node --env-file=.env.local scripts/pipeline/video-backfill.mjs --dry-run      (montre ce qui serait ajouté, n'écrit rien)
//   node --env-file=.env.local scripts/pipeline/video-backfill.mjs --limit 20
//   node --env-file=.env.local scripts/pipeline/video-backfill.mjs --status       (compte les fiches avec / sans vidéo, vérifie la clé, n'appelle pas YouTube)
//
// Même prudence que le worker (scripts/pipeline/video.mjs) : une vidéo n'est gardée que si son titre contient le repère de modèle du produit.
// Un produit sans repère de modèle (ex. « Masque LED visage ») n'est jamais cherché : colle son lien YouTube à la main dans la fiche.
// Quota YouTube : une recherche coûte 100 unités sur 10 000 par jour ; 40 fiches par passage au plus (--limit pour changer),
// et une fiche sans résultat n'est pas recherchée à nouveau avant 30 jours (mémoire dans .video-misses.json).
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { findVideo, modelTokens } from './video.mjs';
import { redact } from './safe.mjs';

export const DEFAULT_LIMIT = 40;
export const RETRY_AFTER_DAYS = 30;
const MISS_FILE = process.env.VIDEO_MISS_FILE || '.video-misses.json';

const dayDiff = (a, b) => Math.floor((new Date(a) - new Date(b)) / 86400000);

/** Fiches à traiter : sans vidéo, avec un repère de modèle, pas cherchées récemment. Les fiches en ligne passent d'abord. */
export function pickTargets(products, misses, now, limit = DEFAULT_LIMIT) {
  const todo = [];
  let noModel = 0;
  let recent = 0;
  for (const p of products) {
    if (p.video_url && String(p.video_url).trim()) continue;
    if (!modelTokens(p.name).length) { noModel++; continue; }
    const m = misses[p.id];
    if (m && dayDiff(now, m) < RETRY_AFTER_DAYS) { recent++; continue; }
    todo.push(p);
  }
  todo.sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)));
  return { todo: todo.slice(0, limit), waiting: Math.max(0, todo.length - limit), noModel, recent };
}

/**
 * @param {{sb:any, find:(q:{name:string,market:string})=>Promise<{url:string}|null>, misses:Record<string,string>, now:Date, dryRun?:boolean, limit?:number, log?:Function}} o
 * @returns {{checked:number, found:number, lines:string[], quotaHit:boolean, noModel:number, waiting:number, misses:Record<string,string>}}
 */
export async function backfillVideos({ sb, find, misses, now, dryRun = false, limit = DEFAULT_LIMIT, log = () => {} }) {
  const { data, error } = await sb.from('products').select('id, slug, name, market, active, video_url').order('created_at', { ascending: false }).limit(2000);
  if (error) throw new Error(`lecture des fiches : ${error.message}`);
  const { todo, waiting, noModel } = pickTargets(data || [], misses, now, limit);
  const out = { checked: 0, found: 0, lines: [], quotaHit: false, noModel, waiting, misses: { ...misses } };
  for (const p of todo) {
    out.checked++;
    try {
      const v = await find({ name: p.name, market: p.market });
      if (!v) {
        out.misses[p.id] = now.toISOString();
        log(`  ${p.slug} (${p.market}) : aucune vidéo fiable`);
        continue;
      }
      if (!dryRun) {
        const up = await sb.from('products').update({ video_url: v.url }).eq('id', p.id);
        if (up.error) throw new Error(up.error.message);
      }
      out.found++;
      out.lines.push(`${p.slug} (${p.market.toUpperCase()}) : ${v.url}${v.title ? ` — « ${v.title} »` : ''}`);
      log(`  ${p.slug} (${p.market}) : ${v.url}`);
    } catch (e) {
      if (/YouTube 403|quota/i.test(e.message)) {
        out.quotaHit = true;
        log(`  Quota YouTube atteint : arrêt, la suite au prochain passage.`);
        break;
      }
      log(`  ${p.slug} (${p.market}) : ${e.message}`);
    }
  }
  return out;
}

export function statusText(products) {
  const by = {};
  for (const p of products) {
    const k = p.market || '?';
    by[k] ??= { total: 0, withVideo: 0, noModel: 0 };
    by[k].total++;
    if (p.video_url && String(p.video_url).trim()) by[k].withVideo++;
    else if (!modelTokens(p.name).length) by[k].noModel++;
  }
  return Object.entries(by).map(([m, s]) => `${m.toUpperCase()} : ${s.withVideo} avec vidéo sur ${s.total} fiches (${s.total - s.withVideo - s.noModel} cherchables, ${s.noModel} sans repère de modèle)`).join('\n');
}

async function readMisses() {
  try {
    return JSON.parse(await readFile(MISS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function main() {
  const args = process.argv.slice(2);
  const val = (n) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absentes (lancer avec --env-file=.env.local)');
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (args.includes('--status')) {
    console.log(apiKey ? 'Clé YouTube (YOUTUBE_API_KEY) : présente.' : 'Clé YouTube (YOUTUBE_API_KEY) : ABSENTE — aucune vidéo ne peut être cherchée automatiquement.');
    const { data, error } = await sb.from('products').select('market, name, video_url').limit(2000);
    if (error) throw new Error(error.message);
    console.log(statusText(data || []));
    return;
  }
  if (!apiKey) throw new Error('YOUTUBE_API_KEY absente de .env.local : ajoute la clé, puis relance (la recherche de vidéo est inactive sans elle).');

  const dryRun = args.includes('--dry-run');
  const limit = Math.max(1, Math.floor(Number(val('limit'))) || DEFAULT_LIMIT);
  const now = new Date();
  const misses = await readMisses();
  const res = await backfillVideos({ sb, find: (q) => findVideo(q, { apiKey }), misses, now, dryRun, limit, log: (m) => console.log(redact(m)) });
  console.log(`\n${dryRun ? 'SIMULATION — ' : ''}${res.found} vidéo(s) trouvée(s) sur ${res.checked} fiche(s) cherchée(s) ; ${res.noModel} sans repère de modèle (à faire à la main) ; ${res.waiting} en attente du prochain passage.`);
  if (!dryRun) {
    try {
      await writeFile(MISS_FILE, JSON.stringify(res.misses));
    } catch (e) {
      console.log(`(mémoire des recherches vides non enregistrée : ${e.message})`);
    }
    if (res.found) {
      const { renderEmail, sendMail } = await import('./notify.mjs');
      const mail = await sendMail(renderEmail({ kind: 'videos', result: res }));
      if (!mail.ok) console.log(`(e-mail non envoyé : ${redact(mail.error)})`);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(redact(e.message || e));
    process.exit(1);
  });
}
