#!/usr/bin/env node
// Ajoute des images source à des produits qui n'ont pas assez de photos (images relevées sur la page AliExpress, galerie et description).
// Le fichier est un JSON : { "1005007345056908": ["https://ae01.alicdn.com/kf/….jpg", "…"], "100500…": ["…"] }
//   node --env-file=.env.local scripts/photos/set-images.mjs images.json --dry-run    (montre ce qui serait fait, n'écrit rien)
//   node --env-file=.env.local scripts/photos/set-images.mjs images.json
// Pour chaque produit : les nouvelles images sont ajoutées à celles qu'on a déjà (sans doublon), puis
//   - produit en erreur (photos insuffisantes)  → remis sur OUI : le worker (toutes les 10 min) refait le tri ;
//   - produit prêt ou en ligne                  → photos_status « redo » : le worker refait le tri et remplace les photos des fiches ;
//   - produit pas encore décidé                 → seules les images sont enregistrées.
// « redo » demande la migration supabase/migrations/20261112000001_trend_photos_redo.sql (à passer une fois dans l'éditeur SQL de Supabase).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { redact } from '../pipeline/safe.mjs';

const ALLOWED_HOST = /(^|\.)(alicdn\.com|aliexpress-media\.com|aliexpress\.com)$/i;

/** Adresse d'image acceptée (https, hôte AliExpress), sans suffixe de miniature ; null sinon. */
export function cleanImageUrl(url, normalize) {
  const u = normalize(url);
  if (!u) return null;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'https:' || !ALLOWED_HOST.test(parsed.hostname)) return null;
  } catch {
    return null;
  }
  return u;
}

/**
 * Décide ce qu'il faut écrire pour un produit.
 * @param {{status:string, decision:string, image_urls?:string[]}} candidate
 * @param {string[]} fresh  nouvelles images (déjà nettoyées)
 * @param {string[]} [fromApi]  images de l'API AliExpress, utilisées si on n'a encore rien enregistré
 * @returns {{patch:object, merged:string[], added:number, action:'retry'|'redo'|'store'}}
 */
export function planImages(candidate, fresh, fromApi = [], now = new Date()) {
  const have = (candidate.image_urls || []).filter(Boolean);
  const base = have.length ? have : fromApi.filter(Boolean);
  const merged = [...new Set([...base, ...fresh])];
  const added = merged.length - new Set(base).size;
  const patch = { image_urls: merged, updated_at: now.toISOString() };
  if (candidate.decision !== 'yes') return { patch, merged, added, action: 'store' };
  if (candidate.status === 'error' || candidate.status === 'validated') {
    return { patch: { ...patch, status: 'validated', error: null, photos_status: 'none', photos: [] }, merged, added, action: 'retry' };
  }
  if (candidate.status === 'ready' || candidate.status === 'live') return { patch: { ...patch, photos_status: 'redo' }, merged, added, action: 'redo' };
  return { patch, merged, added, action: 'store' }; // en cours de traitement : on ne touche pas à l'état
}

export async function applyImages(sb, input, { normalize, apiImages = async () => [], dryRun = false, now = new Date(), log = () => {} } = {}) {
  const out = [];
  for (const [id, urls] of Object.entries(input)) {
    if (!/^\d{6,}$/.test(id)) { out.push({ id, ok: false, message: 'identifiant AliExpress invalide' }); continue; }
    const fresh = [...new Set((Array.isArray(urls) ? urls : []).map((u) => cleanImageUrl(u, normalize)).filter(Boolean))];
    if (!fresh.length) { out.push({ id, ok: false, message: 'aucune adresse d’image valide (https, alicdn.com / aliexpress-media.com)' }); continue; }
    const { data: c, error } = await sb.from('trend_candidates').select('*').eq('aliexpress_id', id).order('week', { ascending: false }).limit(1).maybeSingle();
    if (error) { out.push({ id, ok: false, message: error.message }); continue; }
    if (!c) { out.push({ id, ok: false, message: 'produit introuvable dans la page Tendance' }); continue; }
    let fromApi = [];
    if (!(c.image_urls || []).length) {
      try { fromApi = await apiImages(id); } catch (e) { log(`  ${id} : images de l'API illisibles (${redact(e.message)})`); }
    }
    const plan = planImages(c, fresh, fromApi, now);
    if (!dryRun) {
      const up = await sb.from('trend_candidates').update(plan.patch).eq('id', c.id);
      if (up.error) {
        const hint = /photos_status/.test(up.error.message) ? ' — passe d’abord la migration 20261112000001_trend_photos_redo.sql dans Supabase' : '';
        out.push({ id, name: c.name, ok: false, message: `${up.error.message}${hint}` });
        continue;
      }
    }
    out.push({ id, name: c.name, ok: true, action: plan.action, added: plan.added, total: plan.merged.length });
  }
  return out;
}

const ACTION_LABEL = { retry: 'remis sur OUI, le worker refait le tri', redo: 'tri des photos à refaire (worker)', store: 'images enregistrées' };
export function reportText(rows, dryRun) {
  return rows.map((r) => (r.ok ? `  ✓ ${r.name || r.id} : +${r.added} image(s), ${r.total} au total — ${dryRun ? 'SIMULATION : ' : ''}${ACTION_LABEL[r.action]}` : `  ✗ ${r.name || r.id} : ${r.message}`)).join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) throw new Error('Usage : set-images.mjs <fichier.json> [--dry-run]');
  const input = JSON.parse(await readFile(file, 'utf8'));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absentes (lancer avec --env-file=.env.local)');
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { normalizeImageUrl } = await import('./pipeline.mjs');
  const { getProductForMarket } = await import('../aliexpress/api.mjs');
  const dryRun = args.includes('--dry-run');
  const rows = await applyImages(sb, input, {
    normalize: normalizeImageUrl, dryRun, log: (m) => console.log(m),
    apiImages: async (id) => { const d = await getProductForMarket(id, 'fr'); return d ? [d.mainImage, ...d.images].filter(Boolean).map(normalizeImageUrl).filter(Boolean) : []; },
  });
  console.log(redact(reportText(rows, dryRun)));
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(redact(e.message || e)); process.exit(1); });
}
