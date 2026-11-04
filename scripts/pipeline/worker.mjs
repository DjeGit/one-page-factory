#!/usr/bin/env node
// Flux automatique du OUI (page Tendance de la semaine). À lancer toutes les 10 minutes sur le serveur
// (voir `pipeline-cron.sh trend-worker` : verrou flock, délai maximal, journal horodaté) :
//   */10 * * * * /var/www/one-page-factory/pipeline-cron.sh trend-worker >> /var/log/opf-trend-worker.log 2>&1
// Essais à la main :
//   node --env-file=.env.local scripts/pipeline/worker.mjs --id <aliexpress_id> --dry-run [--text]   (aucune écriture : offres par marché, + aperçu du texte FR avec --text)
//   node --env-file=.env.local scripts/pipeline/worker.mjs --id <aliexpress_id>                       (traite ce produit s'il est sur OUI)
//   node --env-file=.env.local scripts/pipeline/worker.mjs --id <aliexpress_id> --redo-photos          (refait le tri des photos d'un produit déjà prêt)
//   node --env-file=.env.local scripts/pipeline/worker.mjs --no-publish                                (prépare sans mettre en ligne)
//
// Pour chaque produit OUI (status 'validated') : liens affiliés vérifiés par marché → textes → fiches brouillon →
// photos → vidéo → status 'ready' + email. La mise en ligne a lieu à publish_at (24 h pour la 1re fiche du flux, ensuite immédiate),
// uniquement si tous les contrôles sont verts. Rien n'est jamais publié sur un échec.
//
// Sûreté en cas de double lancement ou de coupure :
//  - chaque étape est rejouable (les fiches existantes sont retrouvées par marché + identifiant AliExpress, jamais recréées) ;
//  - un produit « en cours » depuis plus de 30 min est repris, et abandonné au bout de 3 reprises (arrêt brutal à répétition) ;
//  - chaque changement d'état exige que le produit soit encore « en cours » : un 2e passage ne peut écraser ni dupliquer un email.
import { fileURLToPath } from 'node:url';
import { MIN_PHOTOS, checkCandidate, computePublishAt, isPriceStale, needsManualReview, publishIssues, shippingState } from './gates.mjs';
import { collectOffers } from './offers.mjs';
import { generateFicheText } from './fiche-text.mjs';
import { formatSpecs } from './specs.mjs';
import { buildProductRow, LANG_OF_MARKET, slugify, uniqueSlug } from './fiches.mjs';
import { photoStats, summaryLines, when } from './report.mjs';
import { redact } from './safe.mjs';

const MAX_ATTEMPTS = 3;
const STALE_LOCK_MIN = 30;
const MAX_RUN_MIN = 25; // le processus s'arrête de lui-même avant que son verrou ne soit jugé périmé
const PRODUCT_COLS = 'id, slug, name, market, aliexpress_id, active, images, image_url, video_url, free_shipping, source_product_ref';
const CATEGORY_LABELS = {
  tech: 'Tech', 'mode-beaute': 'Mode & Beauté', 'maison-deco': 'Maison & Déco', 'sport-bien-etre': 'Sport & Bien-être',
  'art-design': 'Art & Design', loisirs: 'Loisirs', 'jeux-jouets': 'Jeux & Jouets', puericulture: 'Bébé & Puériculture',
};

export const ymd = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what} : ${error.message}`);
  return data;
};

/** Un email raté (ou refusé par Brevo) ne bloque jamais le flux, mais le journal le dit. */
async function safeMail(d, payload) {
  try {
    const r = await d.mail(payload);
    if (r && r.ok === false) d.log(`  (email non envoyé : ${redact(r.error || `Brevo a répondu ${r.status}`)})`);
  } catch (e) {
    d.log(`  (email non envoyé : ${redact(e.message)})`);
  }
}

// Erreurs passagères d'un service externe (à réessayer plus tard) : surcharge, limite de débit, réseau, délai dépassé, réponse illisible.
const TRANSIENT = /(Gemini|Anthropic|YouTube|Cloudinary|Brevo)[^:]{0,3}:?\s*(429|5\d\d)\b|HTTP 5\d\d|fetch failed|timeout|timed out|ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|UND_ERR|overloaded|high demand|tri photos illisible/i;
export const isTransient = (message) => TRANSIENT.test(String(message || ''));

/** Nombre d'essais déjà faits pour la décision OUI en cours (un nouveau clic sur OUI remet le compteur à zéro). */
const attemptsOf = (c) => (c.pipeline_log?.decided_at === (c.decided_at ?? null) ? Number(c.pipeline_log?.attempts) || 0 : 0);

/**
 * Change l'état d'un produit « en cours ». Refusé (false) s'il n'est plus « en cours » : un autre passage ou un clic de Jerome a
 * déjà décidé, on n'écrase rien et on n'envoie pas d'email en double.
 */
async function leaveInProgress(c, d, patch, what) {
  const rows = must(await d.sb.from('trend_candidates').update(patch).eq('id', c.id).eq('status', 'in_progress').select('id'), what) || [];
  if (!rows.length) d.log('  (le produit a été modifié entre-temps : rien n\'est enregistré)');
  return rows.length > 0;
}

/** Rend un produit à la file (erreur passagère) ou le met en erreur après plusieurs essais. */
async function retryOrFail(c, d, reason, extra = {}) {
  reason = redact(reason);
  const attempts = attemptsOf(c) + 1;
  if (attempts < MAX_ATTEMPTS) {
    d.log(`  ⟳ Problème passager (essai ${attempts} sur ${MAX_ATTEMPTS}) : ${reason}\n    Le produit est remis en file : nouvel essai automatique au prochain passage (dans environ 10 minutes).`);
    const pipeline_log = { ...(c.pipeline_log || {}), attempts, decided_at: c.decided_at ?? null };
    const moved = await leaveInProgress(c, d, { status: 'validated', error: reason, pipeline_log, updated_at: d.now().toISOString() }, 'remise en file');
    return { outcome: moved ? 'retry' : 'skipped', reason };
  }
  return fail(c, d, `${reason} (après ${attempts} essais)`, extra);
}

async function fail(c, d, reason, { products = [], warnings = [], product_ids } = {}) {
  reason = redact(reason);
  d.log(`  ✗ ÉCHEC : ${reason}\n    Rien n'est publié. Une fois la cause réglée, remets le produit sur OUI dans la page Tendance.`);
  const patch = { status: 'error', error: reason, updated_at: d.now().toISOString() };
  if (product_ids) patch.product_ids = product_ids;
  if (!(await leaveInProgress(c, d, patch, 'enregistrement de l’échec'))) return { outcome: 'skipped', reason };
  await safeMail(d, { kind: 'problem', candidate: c, error: reason, products, warnings });
  return { outcome: 'error', reason };
}

const OFFER_LABEL = { ok: 'disponible', unavailable: 'indisponible', blocked: 'bloqué', error: 'erreur du service AliExpress' };
const offerLine = (o) =>
  `  Marché ${o.market.toUpperCase()} : ${OFFER_LABEL[o.status]}${o.status === 'ok' ? ` — ${o.detail.price} ${o.detail.currency}, lien affilié vérifié, écart de prix ${o.gap == null ? 'n/a' : `${Math.round(o.gap * 100)} %`} avec la recherche` : ` — ${o.reasons.join(' ; ')}`}`;

const rowOf = (p) => ({ market: p.market, name: p.name || p.slug, slug: p.slug, price: p.offer?.detail?.price ?? p.price, currency: p.offer?.detail?.currency ?? p.price_currency, commission_rate: p.offer?.detail?.commissionRate ?? p.commission_rate });

/** Prépare un produit validé. @returns {{outcome:'ready'|'error'|'retry'|'skipped', reason?:string}} */
export async function prepareCandidate(c, d, opts = {}) {
  const redoPhotos = !!opts.redoPhotos;
  const today = ymd(d.now());
  d.log(`\n▶ ${c.aliexpress_id} — ${c.name}`);

  const gate = checkCandidate(c);
  if (gate.length) return fail(c, d, gate.join(' ; '));
  const cat = must(await d.sb.from('categories').select('id').eq('slug', c.category_slug).maybeSingle(), 'lecture de la catégorie');
  if (!cat) return fail(c, d, `catégorie introuvable : ${c.category_slug}`);

  // 1. Offres vérifiées par marché
  const offers = await collectOffers(c, d.api);
  for (const o of offers) d.log(offerLine(o));
  if (offers.some((o) => o.status === 'error')) return retryOrFail(c, d, `API AliExpress : ${offers.filter((o) => o.status === 'error').map((o) => `${o.market.toUpperCase()} ${o.reasons[0]}`).join(' ; ')}`);
  const ok = offers.filter((o) => o.status === 'ok');
  const skipped = offers.filter((o) => o.status !== 'ok').map((o) => ({ market: o.market, reasons: o.reasons }));
  if (!ok.length) return fail(c, d, `aucun marché disponible — ${skipped.map((s) => `${s.market.toUpperCase()} : ${s.reasons.join(' ; ')}`).join(' | ')}`);

  // 2. Fiches déjà existantes (relance) : retrouvées par marché + identifiant AliExpress, jamais recréées
  const ids = [...new Set(ok.map((o) => o.itemId))];
  const existing = must(await d.sb.from('products').select(PRODUCT_COLS).in('aliexpress_id', ids).order('created_at'), 'lecture des fiches existantes') || [];

  // 3. Textes + création des fiches (brouillons) pour les marchés sans fiche
  const created = [];
  const all = [];
  for (const o of ok) {
    const prior = existing.find((p) => p.market === o.market && p.aliexpress_id === o.itemId);
    if (prior) {
      const patch = { affiliate_url: o.detail.promotionLink, price: o.detail.price, price_currency: o.detail.currency, price_checked_at: today, commission_rate: o.detail.commissionRate ?? null };
      must(await d.sb.from('products').update(patch).eq('id', prior.id), `mise à jour ${prior.slug}`);
      all.push({ ...prior, offer: o });
      d.log(`  ${o.market.toUpperCase()} : fiche déjà créée (${prior.slug}), textes conservés, lien et prix rafraîchis`);
      continue;
    }
    const lang = LANG_OF_MARKET[o.market];
    let text;
    let specs = '';
    try {
      specs = d.specs ? formatSpecs(await d.specs(o.itemId)) : '';
    } catch (e) {
      d.log(`  (caractéristiques illisibles : ${redact(e.message)})`);
    }
    try {
      ({ text } = await generateFicheText({ lang, title: o.detail.title || c.name, categoryLabel: CATEGORY_LABELS[c.category_slug] || c.category_slug, productType: c.product_type, notes: c.note, specs }, { llm: d.llm }));
    } catch (e) {
      const extra = { product_ids: all.map((p) => p.id), products: all.map(rowOf) };
      if (isTransient(e.message)) return retryOrFail(c, d, `rédaction ${o.market.toUpperCase()} : ${e.message}`, extra);
      return fail(c, d, `rédaction ${o.market.toUpperCase()} : ${e.message}`, extra);
    }
    const base = slugify(text.name) || 'produit';
    const taken = new Set((must(await d.sb.from('products').select('slug').like('slug', `${base}%`), 'lecture des slugs') || []).map((r) => r.slug));
    const row = buildProductRow({ candidate: c, offer: o, text, today, categoryId: cat.id, slug: uniqueSlug(base, taken) });
    const inserted = must(await d.sb.from('products').insert(row).select(PRODUCT_COLS).single(), `création ${row.slug}`);
    created.push(inserted);
    all.push({ ...inserted, offer: o });
    d.log(`  ${o.market.toUpperCase()} : fiche créée (${inserted.slug}), en brouillon : rien n'est en ligne`);
  }

  // 4. Liaison des marchés (la racine = FR sinon la 1re)
  const root = all.find((p) => p.source_product_ref == null && p.market === 'fr') || all.find((p) => p.source_product_ref == null) || all[0];
  for (const p of all) {
    if (p.id !== root.id && p.source_product_ref == null) {
      must(await d.sb.from('products').update({ source_product_ref: root.id }).eq('id', p.id), 'liaison des marchés');
      p.source_product_ref = root.id;
    }
  }
  const productIds = all.map((p) => p.id);
  const summaryRows = () => all.map(rowOf);

  // 5. Photos (partagées entre marchés) : réutilisées si déjà prêtes, sinon traitées
  let photosFresh = false;
  let photos = !redoPhotos && Array.isArray(c.photos) && c.photos.length >= MIN_PHOTOS && ['review', 'approved', 'attached'].includes(c.photos_status) ? c.photos : null;
  let photoReport = photos ? c.photos_report : null;
  const warnings = [];
  if (photos) {
    d.log(`  Photos : ${photos.length} photos déjà triées, réutilisées`);
  } else {
    const first = ok[0].detail;
    const imageUrls = c.image_urls?.length ? c.image_urls : [first.mainImage, ...first.images].filter(Boolean);
    try {
      d.log('  Photos : téléchargement et tri par l’IA…');
      const res = await d.photos({ ...c, image_urls: imageUrls });
      photos = res.photos;
      photoReport = res.report;
      if (!Array.isArray(photos) || photos.length < MIN_PHOTOS || photos.some((p) => !p?.public_id)) throw new Error(`seulement ${photos?.length ?? 0} photo(s) exploitable(s) (minimum ${MIN_PHOTOS})`);
      photosFresh = true;
      warnings.push(...(res.report?.warnings || []));
      must(await d.sb.from('trend_candidates').update({ photos, photos_status: 'approved', photos_report: res.report, image_urls: imageUrls }).eq('id', c.id), 'enregistrement des photos');
    } catch (e) {
      must(await d.sb.from('trend_candidates').update({ photos_status: 'error', photos_report: { error: redact(e.message) } }).eq('id', c.id), 'enregistrement du statut photos');
      // Service momentanément indisponible (surcharge Gemini, réseau) : on remet en file au lieu d'échouer.
      if (isTransient(e.message)) return retryOrFail(c, d, `photos : ${e.message}`, { product_ids: productIds, products: summaryRows() });
      return fail(c, d, `photos : ${e.message}`, { product_ids: productIds, products: summaryRows(), warnings: ['Les fiches (liens, prix, textes) sont créées en brouillon : ajoute les photos dans l’admin, puis active le produit.'] });
    }
  }
  const stats = photoStats(photoReport, photos.length);
  if (photosFresh) d.log(`  Photos : ${stats.kept} retenues${stats.known ? ` sur ${stats.fetched} téléchargées — ${stats.discarded} écartées (${stats.rejectedByAi} refusées par le tri, ${stats.duplicates} doublons, ${stats.tooSmall} trop petites)` : ''}`);
  const publicIds = photos.map((p) => p.public_id);
  for (const p of all) {
    if (!photosFresh && (p.images?.length || p.image_url)) continue;
    must(await d.sb.from('products').update({ images: publicIds, image_url: publicIds[0] }).eq('id', p.id), `photos de ${p.slug}`);
    p.images = publicIds;
    p.image_url = publicIds[0];
  }
  must(await d.sb.from('trend_candidates').update({ photos_status: 'attached' }).eq('id', c.id), 'statut photos');

  // 5b. Vidéo YouTube (facultative, jamais bloquante) et rappel livraison gratuite
  const videos = {};
  for (const p of all) {
    const m = p.market.toUpperCase();
    if (p.video_url) {
      videos[p.market] = 'existing';
      continue;
    }
    if (!d.video) {
      videos[p.market] = 'off';
      continue;
    }
    try {
      const v = await d.video({ name: p.name, market: p.market });
      if (v) {
        must(await d.sb.from('products').update({ video_url: v.url }).eq('id', p.id), `vidéo de ${p.slug}`);
        p.video_url = v.url;
        videos[p.market] = 'found';
        d.log(`  ${m} : vidéo trouvée — ${v.title} (${v.channel})`);
      } else {
        videos[p.market] = 'none';
        warnings.push(`Vidéo ${m} : aucune vidéo fiable trouvée (produit sans repère précis ou aucun test correspondant). À ajouter dans la fiche si tu en as une.`);
      }
    } catch (e) {
      videos[p.market] = 'error';
      d.log(`  (vidéo ${m} : ${redact(e.message)})`);
      warnings.push(`Vidéo ${m} : recherche impossible (${redact(e.message)}).`);
    }
  }
  if (Object.values(videos).includes('off')) warnings.push('Vidéo : recherche automatique inactive (YOUTUBE_API_KEY absente). Colle le lien YouTube dans la fiche si tu en veux une.');
  const shipping = Object.fromEntries(all.map((p) => [p.market, shippingState(c[`free_shipping_${p.market}`], p.free_shipping)]));
  const toCheck = all.filter((p) => shipping[p.market] === 'unknown').map((p) => p.market.toUpperCase());
  if (toCheck.length) warnings.push(`Livraison gratuite non relevée (${toCheck.join(', ')}) : regarde la page de l’offre (lien dans la page Tendance, ou « shipping.mjs list »), puis coche « Livraison gratuite » dans la fiche si elle est offerte.`);

  // 6. Contrôle final des fiches (celles qui ne sont pas encore en ligne), puis « prêt »
  const fresh = must(await d.sb.from('products').select('id, slug, market, active, affiliate_url, image_url, images, price, price_checked_at').in('id', productIds), 'relecture des fiches') || [];
  const issues = [
    ...(fresh.length < productIds.length ? [`${productIds.length - fresh.length} fiche(s) introuvable(s) à la relecture`] : []),
    ...fresh.filter((p) => !p.active).flatMap((p) => publishIssues(p, { minPhotos: MIN_PHOTOS, aliexpressOnly: true, now: d.now() }).map((i) => `${p.market.toUpperCase()} : ${i}`)),
  ];
  if (issues.length) return fail(c, d, `contrôle final : ${issues.join(' ; ')}`, { product_ids: productIds, products: summaryRows() });

  const hold = needsManualReview(c.category_slug, c.name, c.product_type);
  const liveCount = (await d.sb.from('trend_candidates').select('id', { count: 'exact', head: true }).eq('status', 'live')).count || 0;
  const publishAt = hold ? null : computePublishAt(d.now(), liveCount);
  const lines = summaryLines({ offers, photos: stats, videos, shipping, publishAt, hold });
  const nowIso = d.now().toISOString();
  const pipeline_log = {
    attempts: attemptsOf(c), decided_at: c.decided_at ?? null,
    offers: offers.map((o) => ({ market: o.market, itemId: o.itemId, status: o.status, reasons: o.reasons, price: o.detail?.price ?? null, gap: o.gap ?? null })),
    created: created.map((p) => p.slug), photos: stats, videos, shipping, summary: lines,
  };
  const moved = await leaveInProgress(c, d, { status: 'ready', error: null, product_ids: productIds, ready_at: nowIso, publish_at: publishAt ? publishAt.toISOString() : null, hold_reason: hold, pipeline_log, updated_at: nowIso }, 'passage à « prêt »');
  if (!moved) return { outcome: 'skipped' };
  d.log(`  ✓ PRÊT — ${c.name}\n${lines.map((l) => `      ${l}`).join('\n')}`);
  await safeMail(d, { kind: 'ready', candidate: c, products: summaryRows(), photos: photos.length, publishAt, holdReason: hold, skipped, summary: lines, warnings });
  return { outcome: 'ready' };
}

/** Met en ligne un produit prêt dont l'heure est venue, après un dernier contrôle. @returns {{id:string,outcome:string}|null} */
async function publishOne(c, d) {
  const prods = must(await d.sb.from('products').select('id, slug, name, market, active, affiliate_url, image_url, images, price, price_currency, price_checked_at, commission_rate, aliexpress_id').in('id', c.product_ids || []), 'lecture des fiches') || [];
  const rowFor = (p) => ({ market: p.market, name: p.name, slug: p.slug, price: p.price, currency: p.price_currency, commission_rate: p.commission_rate });
  const setCandidate = async (patch, what) => must(await d.sb.from('trend_candidates').update({ ...patch, updated_at: d.now().toISOString() }).eq('id', c.id).eq('status', 'ready').select('id'), what) || [];
  const block = async (reason) => {
    d.log(`  ✗ Mise en ligne bloquée : ${reason}\n    Rien n'est publié. Remets le produit sur OUI dans la page Tendance une fois la cause réglée.`);
    if (!(await setCandidate({ status: 'error', error: redact(reason) }, 'blocage')).length) return null;
    await safeMail(d, { kind: 'problem', candidate: c, error: redact(reason), products: prods.map(rowFor) });
    return { id: c.id, outcome: 'blocked' };
  };

  if (!prods.length) return block('les fiches de ce produit sont introuvables (supprimées ?)');
  // Déjà activé à la main (produit pour enfant vérifié, par exemple) : il suffit de constater.
  if (prods.every((p) => p.active)) {
    await setCandidate({ status: 'live', published_at: d.now().toISOString() }, 'passage à « en ligne »');
    return { id: c.id, outcome: 'live' };
  }
  // Garde-fous refaits à l'heure de la mise en ligne : la catégorie, le nom ou la note ont pu changer depuis la préparation.
  if (c.hold_reason || needsManualReview(c.category_slug, c.name, c.product_type)) return null;
  if (!c.publish_at || new Date(c.publish_at) > d.now()) return null;
  d.log(`\n▶ mise en ligne de ${c.name}`);
  const gate = checkCandidate(c);
  if (gate.length) return block(`contrôle refait : ${gate.join(' ; ')}`);

  // Prix trop ancien (attente de 24 h) : relevé et lien revérifiés avant d'afficher quoi que ce soit.
  const blocked = [];
  let transient = null;
  for (const p of prods) {
    if (p.active || !isPriceStale(p.price_checked_at, d.now())) continue;
    const [o] = await collectOffers(c, d.api, [p.market]);
    if (o.status === 'error') {
      transient = `${p.market.toUpperCase()} : ${o.reasons[0]}`;
      break;
    }
    if (o.status !== 'ok') {
      blocked.push({ market: p.market, reasons: o.reasons });
      continue;
    }
    const patch = { affiliate_url: o.detail.promotionLink, price: o.detail.price, price_currency: o.detail.currency, price_checked_at: ymd(d.now()), commission_rate: o.detail.commissionRate ?? p.commission_rate };
    must(await d.sb.from('products').update(patch).eq('id', p.id), `rafraîchissement ${p.slug}`);
    Object.assign(p, patch);
    d.log(`  ${p.market.toUpperCase()} : prix revérifié ${patch.price} ${patch.price_currency}`);
  }
  if (transient) {
    // Service AliExpress momentanément en panne : on laisse « prêt » et on réessaie au prochain passage (3 fois au plus).
    const tries = (Number(c.pipeline_log?.publish_attempts) || 0) + 1;
    if (tries >= MAX_ATTEMPTS) return block(`API AliExpress indisponible à l'heure de la mise en ligne (${tries} essais) — ${redact(transient)}`);
    d.log(`  ⟳ Problème passager (${tries}/${MAX_ATTEMPTS}) : ${redact(transient)}\n    La mise en ligne est reportée au prochain passage.`);
    must(await d.sb.from('trend_candidates').update({ pipeline_log: { ...(c.pipeline_log || {}), publish_attempts: tries }, updated_at: d.now().toISOString() }).eq('id', c.id).eq('status', 'ready'), 'report de la mise en ligne');
    return { id: c.id, outcome: 'retry' };
  }
  const blockedMarkets = new Set(blocked.map((b) => b.market));
  const toActivate = [];
  for (const p of prods) {
    if (p.active || blockedMarkets.has(p.market)) continue;
    const issues = publishIssues(p, { minPhotos: MIN_PHOTOS, aliexpressOnly: true, now: d.now() });
    if (issues.length) blocked.push({ market: p.market, reasons: issues });
    else toActivate.push(p);
  }
  const alreadyLive = prods.filter((p) => p.active);
  if (!toActivate.length && !alreadyLive.length) return block(blocked.map((b) => `${b.market.toUpperCase()} : ${b.reasons.join(' ; ')}`).join(' | '));
  for (const p of toActivate) must(await d.sb.from('products').update({ active: true }).eq('id', p.id), `activation ${p.slug}`);
  const done = await setCandidate({ status: 'live', error: null, published_at: d.now().toISOString() }, 'passage à « en ligne »');
  const liveMarkets = [...alreadyLive, ...toActivate].map((p) => p.market.toUpperCase());
  d.log(`  ✓ EN LIGNE sur : ${liveMarkets.join(', ')}${blocked.length ? `\n    Restent en brouillon : ${blocked.map((b) => `${b.market.toUpperCase()} (${b.reasons.join(' ; ')})`).join(' | ')}` : ''}`);
  if (!done.length) return null;
  await safeMail(d, {
    kind: 'live', candidate: c,
    products: [...alreadyLive, ...toActivate].map(rowFor),
    warnings: blocked.map((b) => `${b.market.toUpperCase()} resté en brouillon : ${b.reasons.join(' ; ')}`),
  });
  return { id: c.id, outcome: 'live' };
}

/** Met en ligne les produits prêts dont l'heure est venue. Un produit en difficulté ne bloque pas les autres. */
export async function publishDue(d) {
  const rows = must(await d.sb.from('trend_candidates').select('*').eq('status', 'ready').eq('decision', 'yes').order('ready_at'), 'lecture des produits prêts') || [];
  const results = [];
  for (const c of rows) {
    try {
      const r = await publishOne(c, d);
      if (r) results.push({ ...r, name: c.name });
    } catch (e) {
      d.log(`  ✗ Mise en ligne de « ${c.name} » interrompue : ${redact(e.message)}\n    Réessai automatique au prochain passage.`);
      results.push({ id: c.id, name: c.name, outcome: 'error' });
    }
  }
  return results;
}

/** Reprend les produits « en cours » oubliés (arrêt brutal du serveur) ; au bout de 3 reprises, le produit passe en erreur. */
async function recoverStale(d) {
  const staleBefore = new Date(d.now().getTime() - STALE_LOCK_MIN * 60000).toISOString();
  const stale = must(await d.sb.from('trend_candidates').select('*').eq('status', 'in_progress').lt('updated_at', staleBefore), 'reprise des verrous') || [];
  for (const c of stale) {
    const attempts = attemptsOf(c) + 1;
    const nowIso = d.now().toISOString();
    if (attempts < MAX_ATTEMPTS) {
      d.log(`« ${c.name} » repris après une interruption (essai ${attempts} sur ${MAX_ATTEMPTS}).`);
      await leaveInProgress(c, d, { status: 'validated', pipeline_log: { ...(c.pipeline_log || {}), attempts, decided_at: c.decided_at ?? null }, updated_at: nowIso }, 'reprise');
    } else {
      await fail(c, d, `le traitement s’est interrompu ${attempts} fois de suite (arrêt du serveur ou manque de mémoire ?)`);
    }
  }
  return stale.length;
}

/** Un passage complet : reprise des verrous oubliés, préparation des OUI, mise en ligne des produits prêts. */
export async function runOnce(d, { id, publish = true, limit = 2, redoPhotos = false } = {}) {
  await recoverStale(d);

  let q = d.sb.from('trend_candidates').select('*').eq('decision', 'yes');
  const startable = redoPhotos ? ['validated', 'error', 'ready'] : ['validated', 'error'];
  q = id ? q.eq('aliexpress_id', id).in('status', startable) : q.eq('status', 'validated');
  const todo = must(await q.order('decided_at').limit(limit), 'lecture des produits OUI') || [];
  const prepared = [];
  for (const c of todo) {
    const locked = must(await d.sb.from('trend_candidates').update({ status: 'in_progress', updated_at: d.now().toISOString() }).eq('id', c.id).in('status', startable).select('id'), 'verrou') || [];
    if (!locked.length) continue; // pris par un autre passage
    try {
      prepared.push({ id: c.id, name: c.name, ...(await prepareCandidate(c, d, { redoPhotos })) });
    } catch (e) {
      try {
        prepared.push({ id: c.id, name: c.name, ...(await retryOrFail(c, d, `erreur inattendue : ${e.message}`)) });
      } catch (e2) {
        d.log(`  ✗ Impossible d’enregistrer l’erreur (${redact(e2.message)}) : le produit sera repris automatiquement dans 30 minutes.`);
        prepared.push({ id: c.id, name: c.name, outcome: 'error', reason: redact(e.message) });
      }
    }
  }
  const published = publish ? await publishDue(d) : [];
  if (!todo.length && !published.length) {
    d.log(id ? `Rien à faire pour ${id} (introuvable, pas sur OUI, déjà prêt ou en ligne : ajoute --redo-photos pour refaire les photos d’un produit prêt).` : 'Rien à faire.');
  }
  return { prepared, published };
}

const OUTCOME_LABEL = { ready: 'prêt', retry: 'remis en file (problème passager)', error: 'en erreur', skipped: 'ignoré (modifié entre-temps)', live: 'mis en ligne', blocked: 'mise en ligne bloquée' };
export function finalReport({ prepared, published }) {
  const rows = [...prepared, ...published];
  if (!rows.length) return '';
  return `Terminé :\n${rows.map((r) => `  - ${r.name || r.id} : ${OUTCOME_LABEL[r.outcome] || r.outcome}`).join('\n')}`;
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
  // Garde-fou : un service qui ne répond plus ne doit pas bloquer indéfiniment les passages suivants (le verrou flock reste pris tant que ce processus vit).
  setTimeout(() => {
    console.error(`Arrêt : le passage dépasse ${MAX_RUN_MIN} minutes. Les produits « en cours » seront repris au prochain passage.`);
    process.exit(2);
  }, MAX_RUN_MIN * 60000).unref();
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { getProductForMarket, verifyAffiliateLink } = await import('../aliexpress/api.mjs');
  const api = { getProduct: getProductForMarket, verify: verifyAffiliateLink };
  const { callGemini } = await import('./fiche-text.mjs');
  const { fetchSpecs } = await import('./specs.mjs');
  // En-tête daté seulement quand il se passe quelque chose : un passage « rien à faire » toutes les 10 minutes tient sur une ligne.
  let headed = false;
  const log = (m) => {
    if (String(m).startsWith('Rien à faire')) return console.log(`[${new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' })}] ${m}`);
    if (!headed) {
      headed = true;
      console.log(`\n=== Passage du ${when(new Date())} (heure de Madrid) ===`);
    }
    console.log(redact(m));
  };

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
      console.log(`== ${o.market.toUpperCase()} (article ${o.itemId}) : ${OFFER_LABEL[o.status].toUpperCase()}${o.status === 'ok' ? ` — ${o.detail.price} ${o.detail.currency}, commission ${o.detail.commissionRate != null ? (o.detail.commissionRate * 100).toFixed(1) + ' %' : 'n/a'}, écart avec la recherche ${o.gap == null ? 'n/a' : Math.round(o.gap * 100) + ' %'}` : ` — ${o.reasons.join(' ; ')}`}`);
    }
    const hold = needsManualReview(c.category_slug, c.name, c.product_type);
    if (hold) console.log(`Mise en ligne non automatique : ${hold}`);
    if (args.includes('--text')) {
      const first = offers.find((o) => o.status === 'ok');
      if (!first) return console.log('Pas de marché disponible : pas de texte.');
      const lang = LANG_OF_MARKET[first.market];
      let specs = '';
      if (process.env.PIPELINE_SPECS) try {
        const list = await fetchSpecs(first.itemId);
        specs = formatSpecs(list);
        console.log(`\nCaractéristiques lues sur la page : ${list.length}`);
      } catch (e) {
        console.log(`\nCaractéristiques illisibles : ${e.message}`);
      }
      const { text } = await generateFicheText({ lang, title: first.detail.title || c.name, categoryLabel: CATEGORY_LABELS[c.category_slug] || c.category_slug, productType: c.product_type, notes: c.note, specs }, { llm: (p) => callGemini(p) });
      console.log(`\nAperçu du texte (${lang}) :\n${JSON.stringify(text, null, 2)}`);
    }
    return;
  }

  const { processProduct } = await import('../photos/pipeline.mjs');
  const { renderEmail, sendMail } = await import('./notify.mjs');
  const { findVideo } = await import('./video.mjs');
  const d = {
    sb, api, log,
    now: () => new Date(),
    llm: (p) => callGemini(p),
    // Les pages AliExpress sont rendues côté navigateur : aucune caractéristique lisible sans navigateur (PIPELINE_SPECS=1 pour réessayer).
    specs: process.env.PIPELINE_SPECS ? (id) => fetchSpecs(id) : undefined,
    photos: (row) => processProduct(row, { dryRun: false }),
    // Vidéo YouTube : active seulement si YOUTUBE_API_KEY est renseignée.
    video: process.env.YOUTUBE_API_KEY ? (q) => findVideo(q, { apiKey: process.env.YOUTUBE_API_KEY }) : undefined,
    mail: (payload) => sendMail(renderEmail(payload)),
  };
  const res = await runOnce(d, { id: val('id'), publish: !args.includes('--no-publish'), redoPhotos: args.includes('--redo-photos') });

  const report = finalReport(res);
  if (report) log(`\n${report}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(redact(e.message || e));
    process.exit(1);
  });
}
