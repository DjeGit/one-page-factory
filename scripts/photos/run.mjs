#!/usr/bin/env node
// Photos automatiques Tendpick — à lancer sur le serveur (Hetzner), depuis /var/www/one-page-factory :
//   node --env-file=.env.local scripts/photos/run.mjs --probe <aliexpress_id>
//   node --env-file=.env.local scripts/photos/run.mjs --id <aliexpress_id> --dry-run     (aperçus dans ./tmp-photos/<id>/, rien n'est envoyé)
//   node --env-file=.env.local scripts/photos/run.mjs --id <aliexpress_id>               (envoi Cloudinary + enregistrement, statut « review »)
//   node --env-file=.env.local scripts/photos/run.mjs --all                              (tous les produits retenus OUI sans photos)
//   node --env-file=.env.local scripts/photos/run.mjs --approve <aliexpress_id>
//   node --env-file=.env.local scripts/photos/run.mjs --attach <aliexpress_id> --slugs slug-fr,slug-es,slug-uk [--overwrite]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { fetchBuffer, fetchImageUrlsFromItemPage, processProduct } from './pipeline.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const val = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absentes (lancer avec --env-file=.env.local)');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function latestRow(supabase, id) {
  const { data, error } = await supabase.from('trend_candidates').select('*').eq('aliexpress_id', id).order('week', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`produit ${id} introuvable dans trend_candidates`);
  return data;
}

async function probe(id) {
  console.log(`Sonde pour ${id}…`);
  try {
    const urls = await fetchImageUrlsFromItemPage(id);
    console.log(`Page produit : OK, ${urls.length} photo(s) trouvée(s).`);
    const buf = await fetchBuffer(urls[0]);
    console.log(`Téléchargement de la 1re photo : OK (${Math.round(buf.length / 1024)} Ko).`);
  } catch (e) {
    console.log(`Échec : ${e.message}`);
    console.log("→ La page produit n'est pas lisible depuis le serveur : on passera par l'API officielle AliExpress ou par une liste d'URLs (colonne image_urls).");
  }
}

async function runOne(supabase, row, { dryRun }) {
  console.log(`\n${row.aliexpress_id} — ${row.name}`);
  try {
    const { photos, report, previews } = await processProduct(row, { dryRun });
    if (dryRun) {
      const dir = join('tmp-photos', row.aliexpress_id);
      mkdirSync(dir, { recursive: true });
      for (const p of previews) writeFileSync(join(dir, p.name), p.buffer);
      writeFileSync(join(dir, 'rapport.json'), JSON.stringify({ photos, report }, null, 2));
      console.log(`  ${photos.length} photo(s) dans ${dir}/ (rien envoyé)`);
    } else {
      const { error } = await supabase
        .from('trend_candidates')
        .update({ photos, photos_status: 'review', photos_report: report, error: null, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) throw error;
      console.log(`  ${photos.length} photo(s) envoyée(s) sur Cloudinary — statut « review »`);
    }
    for (const w of report.warnings) console.log(`  ⚠ ${w}`);
    console.log(`  téléchargées ${report.fetched}, doublons ${report.duplicates}, trop petites ${report.tooSmall}, écartées par le tri ${report.rejected.length}`);
    for (const p of photos) console.log(`  - ${p.kind} (texte ${p.text}${p.flags.length ? ', ' + p.flags.join(', ') : ''})`);
  } catch (e) {
    console.log(`  ERREUR : ${e.message}`);
    if (!dryRun) await supabase.from('trend_candidates').update({ photos_status: 'error', photos_report: { error: e.message }, updated_at: new Date().toISOString() }).eq('id', row.id);
  }
}

async function main() {
  if (val('probe')) return probe(val('probe'));
  const supabase = db();

  if (val('approve')) {
    const row = await latestRow(supabase, val('approve'));
    const { error } = await supabase.from('trend_candidates').update({ photos_status: 'approved', updated_at: new Date().toISOString() }).eq('id', row.id);
    if (error) throw error;
    return console.log('Photos validées.');
  }

  if (val('attach')) {
    const row = await latestRow(supabase, val('attach'));
    const slugs = (val('slugs') || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!slugs.length) throw new Error('--slugs obligatoire (slugs des fiches FR, ES, UK séparés par des virgules)');
    if (!['review', 'approved', 'attached'].includes(row.photos_status) || !row.photos?.length) throw new Error('aucune photo à rattacher (lancer --id d\'abord)');
    const ids = row.photos.map((p) => p.public_id);
    for (const slug of slugs) {
      const { data: prod, error: e1 } = await supabase.from('products').select('id, images, active').eq('slug', slug).maybeSingle();
      if (e1) throw e1;
      if (!prod) {
        console.log(`  ${slug} : introuvable`);
        continue;
      }
      if (prod.images?.length && !flag('overwrite')) {
        console.log(`  ${slug} : a déjà ${prod.images.length} photo(s) — ajouter --overwrite pour les remplacer`);
        continue;
      }
      const { error } = await supabase.from('products').update({ images: ids, image_url: ids[0] }).eq('id', prod.id);
      if (error) throw error;
      console.log(`  ${slug} : ${ids.length} photos rattachées${prod.active ? '' : ' (fiche toujours en brouillon)'}`);
    }
    await supabase.from('trend_candidates').update({ photos_status: 'attached', updated_at: new Date().toISOString() }).eq('id', row.id);
    return;
  }

  const dryRun = flag('dry-run');
  if (val('id')) {
    const row = await latestRow(supabase, val('id'));
    return runOne(supabase, row, { dryRun });
  }
  if (flag('all')) {
    const { data, error } = await supabase.from('trend_candidates').select('*').eq('decision', 'yes').in('photos_status', ['none', 'error']);
    if (error) throw error;
    console.log(`${data.length} produit(s) retenu(s) sans photos.`);
    for (const row of data) await runOne(supabase, row, { dryRun });
    return;
  }
  console.log('Usage : voir l\'en-tête de scripts/photos/run.mjs');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
