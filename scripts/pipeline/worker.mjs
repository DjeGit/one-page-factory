#!/usr/bin/env node
// Flux automatique du OUI (page Tendance de la semaine). À lancer toutes les 10 minutes sur le serveur :
//   */10 * * * * cd /var/www/one-page-factory && flock -n /tmp/opf-trend-worker.lock node --env-file=.env.local scripts/pipeline/worker.mjs >> /var/log/opf-trend-worker.log 2>&1
// Essais à la main :
//   node --env-file=.env.local scripts/pipeline/worker.mjs --id <aliexpress_id> --dry-run [--text]   (aucune écriture : offres par marché, + aperçu du texte FR avec --text)
//   node --env-file=.env.local scripts/pipeline/worker.mjs --id <aliexpress_id>                       (traite ce produit s'il est sur OUI)
//   node --env-file=.env.local scripts/pipeline/worker.mjs --no-publish                                (prépare sans mettre en ligne)
//
// Pour chaque produit OUI (status 'validated') : liens affiliés vérifiés par marché → textes → fiches brouillon →
// photos → status 'ready' + email. La mise en ligne a lieu à publish_at (24 h pour la 1re fiche du flux, ensuite immédiate),
// uniquement si tous les contrôles sont verts. Rien n'est jamais publié sur un échec.
import { fileURLToPath } from 'node:url';
import { checkCandidate, computePublishAt, isPriceStale, needsManualReview, publishIssues } from './gates.mjs';
import { collectOffers } from './offers.mjs';
import { generateFicheText, LANGS } from './fiche-text.mjs';
import { buildProductRow, LANG_OF_MARKET, slugify, uniqueSlug } from './fiches.mjs';

const MIN_PHOTOS = 3;
const MAX_ATTEMPTS = 3;
const STALE_LOCK_MIN = 30;
const CATEGORY_LABELS = {
  tech: 'Tech', 'mode-beaute': 'Mode & Beauté', 'maison-deco': 'Maison & Déco', 'sport-bien-etre': 'Sport & Bien-être',
  'art-design': 'Art & Design', loisirs: 'Loisirs', 'jeux-jouets': 'Jeux & Jouets', puericulture: 'Bébé & Puériculture',
};

export const ymd = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what} : ${error.message}`);
  return data;
};

async function safeMail(d, payload) {
  try {
    await d.mail(payload);
  } catch (e) {
    d.log(`  (email non envoyé : ${e.message})`);
  }
}

/** Rend un produit à la file (erreur passagère) ou le met en erreur après plusieurs essais. */
async function retryOrFail(c, d, reason, extra = {}) {
  const attempts = (c.pipeline_log?.attempts || 0) + 1;
  const now = d.now().toISOString();
  if (attempts < MAX_ATTEMPTS) {
    d.log(`  erreur passagère (essai ${attempts}/${MAX_ATTEMPTS}) : ${reason}`);
    must(await d.sb.from('trend_candidates').update({ status: 'validated', error: reason, pipeline_log: { ...(c.pipeline_log || {}), attempts }, updated_at: now }).eq('id', c.id), 'remise en file');
    return { outcome: 'retry', reason };
  }
  return fail(c, d, `${reason} (après ${attempts} essais)`, extra);
}

async function fail(c, d, reason, { products = [], warnings = [], product_ids } = {}) {
  d.log(`  ÉCHEC : ${reason}`);
  const patch = { status: 'error', error: reason, updated_at: d.now().toISOString() };
  if (product_ids) patch.product_ids = product_ids;
  must(await d.sb.from('trend_candidates').update(patch).eq('id', c.id), 'enregistrement de l’échec');
  await safeMail(d, { kind: 'problem', candidate: c, error: reason, products, warnings });
  return { outcome: 'error', reason };
}

const summarize = (p) => ({ market: p.market, name: p.name, slug: p.slug, price: p.price, currency: p.price_currency, commission_rate: p.commission_rate });

/** Prépare un produit validé. @returns {{outcome:'ready'|'error'|'retry', reason?:string}} */
export async function prepareCandidate(c, d) {
  const today = ymd(d.now());
  d.log(`\n▶ ${c.aliexpress_id} — ${c.name}`);

  const gate = checkCandidate(c);
  if (gate.length) return fail(c, d, gate.join(' ; '));

  // 1. Offres vérifiées par marché
  const offers = await collectOffers(c, d.api);
  for (const o of offers) d.log(`  ${o.market.toUpperCase()} : ${o.status}${o.status === 'ok' ? ` — ${o.detail.price} ${o.detail.currency} (écart ${o.gap == null ? 'n/a' : Math.round(o.gap * 100) + ' %'})` : ` — ${o.reasons.join(' ; ')}`}`);
  if (offers.some((o) => o.status === 'error')) return retryOrFail(c, d, `API : ${offers.filter((o) => o.status === 'error').map((o) => `${o.market} ${o.reasons[0]}`).join(' ; ')}`);
  const ok = offers.filter((o) => o.status === 'ok');
  const skipped = offers.filter((o) => o.status !== 'ok').map((o) => ({ market: o.market, reasons: o.reasons }));
  if (!ok.length) return fail(c, d, `aucun marché disponible — ${skipped.map((s) => `${s.market.toUpperCase()} : ${s.reasons.join(' ; ')}`).join(' | ')}`);

  // 2. Fiches déjà existantes (relance) et catégorie
  const ids = [...new Set(ok.map((o) => o.itemId))];
  const existing = must(await d.sb.from('products').select('id, slug, name, market, aliexpress_id, active, images, image_url, source_product_ref').in('aliexpress_id', ids), 'lecture des fiches existantes') || [];
  const cat = must(await d.sb.from('categories').select('id').eq('slug', c.category_slug).maybeSingle(), 'lecture de la catégorie');
  if (!cat) return fail(c, d, `catégorie introuvable : ${c.category_slug}`);

  // 3. Textes + création des fiches (brouillons) pour les marchés sans fiche
  const created = [];
  const all = [];
  for (const o of ok) {
    const prior = existing.find((p) => p.market === o.market && p.aliexpress_id === o.itemId);
    if (prior) {
      const patch = { affiliate_url: o.detail.promotionLink, price: o.detail.price, price_currency: o.detail.currency, price_checked_at: today, commission_rate: o.detail.commissionRate ?? null };
      must(await d.sb.from('products').update(patch).eq('id', prior.id), `mise à jour ${prior.slug}`);
      all.push({ ...prior, offer: o });
      d.log(`  ${o.market.toUpperCase()} : fiche existante ${prior.slug}, lien et prix rafraîchis`);
      continue;
    }
    const lang = LANG_OF_MARKET[o.market];
    let text;
    try {
      ({ text } = await generateFicheText({ lang, title: o.detail.title || c.name, categoryLabel: CATEGORY_LABELS[c.category_slug] || c.category_slug, productType: c.product_type, notes: c.note }, { llm: d.llm }));
    } catch (e) {
      return fail(c, d, e.message, { product_ids: all.map((p) => p.id) });
    }
    const base = slugify(text.name);
    const taken = new Set((must(await d.sb.from('products').select('slug').like('slug', `${base}%`), 'lecture des slugs') || []).map((r) => r.slug));
    const row = buildProductRow({ candidate: c, offer: o, text, today, categoryId: cat.id, slug: uniqueSlug(base, taken) });
    const inserted = must(await d.sb.from('products').insert(row).select('id, slug, name, market, aliexpress_id, active, images, image_url, source_product_ref').single(), `création ${row.slug}`);
    created.push(inserted);
    all.push({ ...inserted, offer: o });
    d.log(`  ${o.market.toUpperCase()} : fiche créée ${inserted.slug} (brouillon)`);
  }

  // 4. Liaison des marchés (la racine = FR sinon la 1re)
  const root = all.find((p) => p.source_product_ref == null && p.market === 'fr') || all.find((p) => p.source_product_ref == null) || all[0];
  for (const p of all) {
    if (p.id !== root.id && p.source_product_ref == null) must(await d.sb.from('products').update({ source_product_ref: root.id }).eq('id', p.id), 'liaison des marchés');
  }
  const productIds = all.map((p) => p.id);
  const summaryRows = () => all.map((p) => ({ market: p.market, name: p.name || p.slug, slug: p.slug, price: p.offer.detail.price, currency: p.offer.detail.currency, commission_rate: p.offer.detail.commissionRate }));

  // 5. Photos (partagées entre marchés) : réutilisées si déjà prêtes, sinon traitées
  let photos = Array.isArray(c.photos) && c.photos.length >= MIN_PHOTOS && ['review', 'approved', 'attached'].includes(c.photos_status) ? c.photos : null;
  const photoWarnings = [];
  if (!photos) {
    const first = ok[0].detail;
    const imageUrls = c.image_urls?.length ? c.image_urls : [first.mainImage, ...first.images].filter(Boolean);
    try {
      const res = await d.photos({ ...c, image_urls: imageUrls });
      photos = res.photos;
      photoWarnings.push(...(res.report?.warnings || []));
      must(await d.sb.from('trend_candidates').update({ photos, photos_status: 'approved', photos_report: res.report, image_urls: imageUrls }).eq('id', c.id), 'enregistrement des photos');
    } catch (e) {
      must(await d.sb.from('trend_candidates').update({ photos_status: 'error', photos_report: { error: e.message } }).eq('id', c.id), 'enregistrement du statut photos');
      return fail(c, d, `photos : ${e.message}`, { product_ids: productIds, products: summaryRows(), warnings: ['Les fiches (liens, prix, textes) sont créées en brouillon : ajoute les photos dans l’admin, puis active le produit.'] });
    }
  }
  const publicIds = photos.map((p) => p.public_id);
  for (const p of all) {
    if (p.images?.length || p.image_url) continue;
    must(await d.sb.from('products').update({ images: publicIds, image_url: publicIds[0] }).eq('id', p.id), `photos de ${p.slug}`);
    p.images = publicIds;
    p.image_url = publicIds[0];
  }
  must(await d.sb.from('trend_candidates').update({ photos_status: 'attached' }).eq('id', c.id), 'statut photos');

  // 6. Contrôle final des fiches, puis « prêt »
  const fresh = must(await d.sb.from('products').select('id, slug, market, affiliate_url, image_url, images, price, price_checked_at').in('id', productIds), 'relecture des fiches');
  const issues = fresh.flatMap((p) => publishIssues(p).map((i) => `${p.market.toUpperCase()} : ${i}`));
  if (issues.length) return fail(c, d, `contrôle final : ${issues.join(' ; ')}`, { product_ids: productIds, products: summaryRows() });

  const hold = needsManualReview(c.category_slug);
  const liveCount = (await d.sb.from('trend_candidates').select('id', { count: 'exact', head: true }).eq('status', 'live')).count || 0;
  const publishAt = hold ? null : computePublishAt(d.now(), liveCount);
  const nowIso = d.now().toISOString();
  must(
    await d.sb.from('trend_candidates').update({
      status: 'ready', error: null, product_ids: productIds, ready_at: nowIso, publish_at: publishAt ? publishAt.toISOString() : null, hold_reason: hold,
      pipeline_log: { attempts: c.pipeline_log?.attempts || 0, offers: offers.map((o) => ({ market: o.market, itemId: o.itemId, status: o.status, reasons: o.reasons, price: o.detail?.price ?? null, gap: o.gap ?? null })), created: created.map((p) => p.slug) },
      updated_at: nowIso,
    }).eq('id', c.id),
    'passage à « prêt »'
  );
  d.log(`  PRÊT — ${hold ? `mise en ligne manuelle (${hold})` : `mise en ligne prévue ${publishAt.toISOString()}`}`);
  await safeMail(d, { kind: 'ready', candidate: c, products: summaryRows(), photos: photos.length, publishAt, holdReason: hold, skipped, warnings: photoWarnings });
  return { outcome: 'ready' };
}

/** Met en ligne les produits prêts dont l'heure est venue, après un dernier contrôle. */
export async function publishDue(d) {
  const rows = must(await d.sb.from('trend_candidates').select('*').eq('status', 'ready').eq('decision', 'yes').order('ready_at'), 'lecture des produits prêts') || [];
  const results = [];
  for (const c of rows) {
    const prods = must(await d.sb.from('products').select('id, slug, name, market, active, affiliate_url, image_url, images, price, price_currency, price_checked_at, commission_rate, aliexpress_id').in('id', c.product_ids || []), 'lecture des fiches') || [];
    if (!prods.length) continue;
    if (prods.every((p) => p.active)) {
      must(await d.sb.from('trend_candidates').update({ status: 'live', published_at: d.now().toISOString(), updated_at: d.now().toISOString() }).eq('id', c.id), 'passage à « en ligne »');
      results.push({ id: c.id, outcome: 'live' });
      continue;
    }
    if (c.hold_reason || !c.publish_at || new Date(c.publish_at) > d.now()) continue;
    d.log(`\n▶ mise en ligne de ${c.name}`);

    // Prix trop ancien (attente de 24 h) : relevé et lien revérifiés avant d'afficher quoi que ce soit.
    const blocked = [];
    for (const p of prods) {
      if (p.active || !isPriceStale(p.price_checked_at, d.now())) continue;
      const [o] = await collectOffers(c, d.api, [p.market]);
      if (o.status !== 'ok') {
        blocked.push({ market: p.market, reasons: o.reasons });
        continue;
      }
      const patch = { affiliate_url: o.detail.promotionLink, price: o.detail.price, price_currency: o.detail.currency, price_checked_at: ymd(d.now()), commission_rate: o.detail.commissionRate ?? p.commission_rate };
      must(await d.sb.from('products').update(patch).eq('id', p.id), `rafraîchissement ${p.slug}`);
      Object.assign(p, patch);
      d.log(`  ${p.market.toUpperCase()} : prix revérifié ${patch.price} ${patch.price_currency}`);
    }
    const blockedMarkets = new Set(blocked.map((b) => b.market));
    const toActivate = [];
    for (const p of prods) {
      if (p.active) continue;
      const issues = publishIssues(p);
      if (blockedMarkets.has(p.market)) continue;
      if (issues.length) blocked.push({ market: p.market, reasons: issues });
      else toActivate.push(p);
    }
    if (!toActivate.length) {
      const reason = `mise en ligne bloquée — ${blocked.map((b) => `${b.market.toUpperCase()} : ${b.reasons.join(' ; ')}`).join(' | ')}`;
      must(await d.sb.from('trend_candidates').update({ status: 'error', error: reason, updated_at: d.now().toISOString() }).eq('id', c.id), 'blocage');
      await safeMail(d, { kind: 'problem', candidate: c, error: reason, products: prods.map((p) => ({ market: p.market, name: p.name, slug: p.slug, price: p.price, currency: p.price_currency, commission_rate: p.commission_rate })) });
      results.push({ id: c.id, outcome: 'blocked' });
      continue;
    }
    for (const p of toActivate) must(await d.sb.from('products').update({ active: true }).eq('id', p.id), `activation ${p.slug}`);
    must(await d.sb.from('trend_candidates').update({ status: 'live', error: null, published_at: d.now().toISOString(), updated_at: d.now().toISOString() }).eq('id', c.id), 'passage à « en ligne »');
    d.log(`  EN LIGNE sur : ${toActivate.map((p) => p.market).join(', ')}${blocked.length ? ` — restent en brouillon : ${blocked.map((b) => b.market).join(', ')}` : ''}`);
    await safeMail(d, {
      kind: 'live', candidate: c,
      products: toActivate.map((p) => ({ market: p.market, name: p.name, slug: p.slug, price: p.price, currency: p.price_currency, commission_rate: p.commission_rate })),
      warnings: blocked.map((b) => `${b.market.toUpperCase()} resté en brouillon : ${b.reasons.join(' ; ')}`),
    });
    results.push({ id: c.id, outcome: 'live' });
  }
  return results;
}

/** Un passage complet : reprise des verrous oubliés, préparation des OUI, mise en ligne des produits prêts. */
export async function runOnce(d, { id, publish = true, limit = 2 } = {}) {
  const nowIso = d.now().toISOString();
  const staleBefore = new Date(d.now().getTime() - STALE_LOCK_MIN * 60000).toISOString();
  const stale = must(await d.sb.from('trend_candidates').update({ status: 'validated', updated_at: nowIso }).eq('status', 'in_progress').lt('updated_at', staleBefore).select('id'), 'reprise des verrous') || [];
  if (stale.length) d.log(`${stale.length} produit(s) repris après une interruption.`);

  let q = d.sb.from('trend_candidates').select('*').eq('decision', 'yes');
  q = id ? q.eq('aliexpress_id', id).in('status', ['validated', 'error']) : q.eq('status', 'validated');
  const todo = must(await q.order('decided_at').limit(limit), 'lecture des produits OUI') || [];
  const prepared = [];
  for (const c of todo) {
    const locked = must(await d.sb.from('trend_candidates').update({ status: 'in_progress', updated_at: nowIso }).eq('id', c.id).in('status', ['validated', 'error']).select('id'), 'verrou') || [];
    if (!locked.length) continue; // pris par un autre passage
    try {
      prepared.push({ id: c.id, ...(await prepareCandidate(c, d)) });
    } catch (e) {
      prepared.push({ id: c.id, ...(await retryOrFail(c, d, `erreur inattendue : ${e.message}`)) });
    }
  }
  const published = publish ? await publishDue(d) : [];
  if (!todo.length && !published.length) d.log('Rien à faire.');
  return { prepared, published };
}

// ─── Lancement en ligne de commande ────────────────────────────────────────

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
  const { getProductForMarket, verifyAffiliateLink } = await import('../aliexpress/api.mjs');
  const api = { getProduct: getProductForMarket, verify: verifyAffiliateLink };
  const { callGemini } = await import('./fiche-text.mjs');
  const log = (m) => console.log(m);

  if (args.includes('--dry-run')) {
    const id = val('id');
    if (!id) throw new Error('--dry-run demande --id <aliexpress_id>');
    const { data: c, error } = await sb.from('trend_candidates').select('*').eq('aliexpress_id', id).order('week', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!c) throw new Error(`produit ${id} introuvable dans trend_candidates`);
    console.log(`SIMULATION — ${c.name} (catégorie ${c.category_slug}, note ${c.rating ?? 'n/a'})`);
    const gate = checkCandidate(c);
    if (gate.length) console.log(`Refusé d'office : ${gate.join(' ; ')}`);
    const offers = await collectOffers(c, api);
    for (const o of offers) {
      console.log(`== ${o.market.toUpperCase()} (article ${o.itemId}) : ${o.status.toUpperCase()}${o.status === 'ok' ? ` — ${o.detail.price} ${o.detail.currency}, commission ${o.detail.commissionRate != null ? (o.detail.commissionRate * 100).toFixed(1) + ' %' : 'n/a'}, écart avec la recherche ${o.gap == null ? 'n/a' : Math.round(o.gap * 100) + ' %'}` : ` — ${o.reasons.join(' ; ')}`}`);
    }
    const hold = needsManualReview(c.category_slug);
    if (hold) console.log(`Mise en ligne non automatique : ${hold}`);
    if (args.includes('--text')) {
      const first = offers.find((o) => o.status === 'ok');
      if (!first) return console.log('Pas de marché disponible : pas de texte.');
      const lang = LANG_OF_MARKET[first.market];
      const { text } = await generateFicheText({ lang, title: first.detail.title || c.name, categoryLabel: CATEGORY_LABELS[c.category_slug] || c.category_slug, productType: c.product_type, notes: c.note }, { llm: (p) => callGemini(p) });
      console.log(`\nAperçu du texte (${lang}) :\n${JSON.stringify(text, null, 2)}`);
    }
    return;
  }

  const { processProduct } = await import('../photos/pipeline.mjs');
  const { renderEmail, sendMail } = await import('./notify.mjs');
  const d = {
    sb, api, log,
    now: () => new Date(),
    llm: (p) => callGemini(p),
    photos: (row) => processProduct(row, { dryRun: false }),
    mail: (payload) => sendMail(renderEmail(payload)),
  };
  const res = await runOnce(d, { id: val('id'), publish: !args.includes('--no-publish') });
  log(`\nTerminé : ${res.prepared.length} préparé(s), ${res.published.length} mis en ligne.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
