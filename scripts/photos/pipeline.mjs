// Pipeline photos Tendpick : photos du vendeur → 5 photos carrées 1000x1000 sur Cloudinary.
// Pur Node (aucune compilation) : `node --env-file=.env.local scripts/photos/run.mjs …`
// Étapes : télécharger → écarter les images trop petites et les doublons → faire trier les images par Claude ou Gemini
// (affiches promo, bandeaux, texte lourd = écartés) → choisir 5 photos variées → recadrer en carré → Cloudinary.
// Le texte incrusté n'est pas réécrit automatiquement : on garde les photos « nues » (règle de la fiche produit).
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const SIZE = 1000;
export const MAX_PHOTOS = 5;
export const MIN_PHOTOS = 3;
const MIN_SIDE = 400;
const MAX_BYTES = 15 * 1024 * 1024;
const REJECT_KINDS = new Set(['promo', 'size_chart', 'packaging', 'other']);
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// ─── URLs ───────────────────────────────────────────────────────────────────

/** Retire les suffixes de miniature AliExpress : `.jpg_640x640q80.jpg_.webp` → `.jpg` (image d'origine). */
export function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  let u = url.trim().replace(/\\\//g, '/');
  if (u.startsWith('//')) u = `https:${u}`;
  if (!/^https?:\/\//i.test(u)) return null;
  u = u.split('?')[0];
  const m = u.match(/^(.*?\.(?:jpe?g|png|webp))(?:_[^/]*)?$/i);
  return m ? m[1] : u;
}

/** Lit la page produit : photos de la galerie (`imagePathList`) et, au mieux, photos de la description. Peut échouer (captcha). */
export async function fetchItemPage(aliexpressId) {
  const res = await fetch(`https://www.aliexpress.com/item/${aliexpressId}.html`, {
    headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`page produit HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/"imagePathList"\s*:\s*\[([^\]]*)\]/);
  if (!m) throw new Error('imagePathList introuvable (captcha ou page différente)');
  const gallery = [...new Set([...m[1].matchAll(/"([^"]+)"/g)].map((x) => normalizeImageUrl(x[1])).filter(Boolean))];
  if (!gallery.length) throw new Error('imagePathList vide');
  let description = [];
  try {
    const d = html.match(/"descriptionUrl"\s*:\s*"([^"]+)"/);
    if (d) {
      const dres = await fetch(d[1].replace(/\\\//g, '/'), { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
      if (dres.ok) {
        const dhtml = await dres.text();
        description = [...dhtml.matchAll(/(?:src|data-src)\s*=\s*["']([^"']+)["']/gi)]
          .map((x) => x[1])
          .filter((u) => !/\.(gif|svg)(\?|$)/i.test(u))
          .map(normalizeImageUrl)
          .filter(Boolean);
        description = [...new Set(description)].filter((u) => !gallery.includes(u)).slice(0, 8);
      }
    }
  } catch {
    description = [];
  }
  return { gallery, description };
}

export async function fetchImageUrlsFromItemPage(aliexpressId) {
  return (await fetchItemPage(aliexpressId)).gallery;
}

// ─── Téléchargement ─────────────────────────────────────────────────────────

export async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, referer: 'https://www.aliexpress.com/', accept: 'image/*,*/*;q=0.8' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error('image trop lourde');
  if (buf.length < 2000) throw new Error('réponse trop petite (pas une image)');
  return buf;
}

// ─── Doublons (dHash 64 bits) ───────────────────────────────────────────────

export async function dHash(buf) {
  const px = await sharp(buf).grayscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let h = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      h = (h << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n);
    }
  }
  return h;
}

export function hamming(a, b) {
  let x = a ^ b;
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

/** Garde la première occurrence de chaque image (distance de Hamming > 5). */
export async function dedupe(items) {
  const kept = [];
  const hashes = [];
  for (const it of items) {
    const h = await dHash(it.buf);
    if (hashes.some((o) => hamming(o, h) <= 5)) continue;
    hashes.push(h);
    kept.push(it);
  }
  return kept;
}

// ─── Recadrage carré ────────────────────────────────────────────────────────

/** Vrai si le pourtour de l'image est quasi blanc et uniforme (photo détourée sur fond blanc). */
export async function hasWhiteBorder(buf) {
  const n = 32;
  const px = await sharp(buf).removeAlpha().resize(n, n, { fit: 'fill' }).raw().toBuffer();
  let sum = 0;
  let count = 0;
  let min = 255;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (x > 1 && x < n - 2 && y > 1 && y < n - 2) continue;
      for (let c = 0; c < 3; c++) {
        const v = px[(y * n + x) * 3 + c];
        sum += v;
        count++;
        if (v < min) min = v;
      }
    }
  }
  return sum / count >= 240 && min >= 200;
}

/** JPEG carré SIZE×SIZE. Quasi carré → recadrage ; fond blanc → marges blanches (rien n'est coupé) ; sinon recadrage centré sur le sujet. */
export async function toSquareJpeg(buf, size = SIZE) {
  const meta = await sharp(buf).metadata();
  const ratio = meta.width / meta.height;
  const flags = [];
  let img;
  let mode;
  if (ratio >= 0.9 && ratio <= 1.1) {
    mode = 'cover';
    img = sharp(buf).resize(size, size, { fit: 'cover' });
  } else if (await hasWhiteBorder(buf)) {
    mode = 'contain-white';
    img = sharp(buf).resize(size, size, { fit: 'contain', background: '#ffffff' });
  } else {
    mode = 'cover-attention';
    img = sharp(buf).resize(size, size, { fit: 'cover', position: sharp.strategy.attention });
    if (ratio < 0.6 || ratio > 1.7) flags.push('recadrage_fort');
  }
  if (Math.min(meta.width, meta.height) < size * 0.8) flags.push('basse_resolution');
  const out = await img.flatten({ background: '#ffffff' }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return { buffer: out, mode, flags };
}

// ─── Tri par Claude (vision) ────────────────────────────────────────────────

const CLASSIFY_PROMPT = `Tu tries les photos d'une annonce AliExpress pour une fiche produit d'un site d'affiliation (Tendpick).
Pour CHAQUE image numérotée, réponds par un objet JSON. Réponds uniquement par un tableau JSON, sans texte autour :
[{"index":0,"usable":true,"kind":"product_white","text":"none","watermark":false,"score":4,"clean_box":null,"note":"…"}]
- kind : "product_white" (produit seul sur fond blanc/uni), "product_in_use" (produit porté/utilisé, mise en situation), "detail" (gros plan, composant, accessoire), "infographic" (schéma/caractéristiques avec beaucoup de texte), "promo" (affiche promotionnelle : SALE, 11.11, coupon, remise, prix, bandeau « 100% Original », « Fast Shipping »), "size_chart" (tableau de tailles), "packaging" (emballage, boîte, carton), "other".
- text : texte incrusté dans l'image : "none" (aucun), "light" (un petit logo ou une courte légende discrète), "heavy" (paragraphes, listes, gros titres, bandeaux).
- watermark : true si un filigrane ou logo de vendeur est visible.
- score : 1 à 5 (netteté, éclairage, intérêt commercial, composition).
- usable : false si promo, size_chart, packaging, other, image floue, ou collage de plusieurs vignettes. Une image avec beaucoup de texte reste usable si elle contient une vraie photo du produit : renseigne alors clean_box.
- clean_box : [ymin, xmin, ymax, xmax] sur une échelle de 0 à 1000 = le plus GRAND rectangle de l'image qui montre le produit (ou la personne qui le porte) SANS AUCUN texte, titre, logo, badge ni bandeau à l'intérieur. Cherche-le activement pour toute image dont "text" vaut "heavy" : si le texte n'occupe qu'un bord (titre en haut, légende en bas, colonne à côté), la zone propre est le reste de l'image (ex. titre en haut → [250, 0, 1000, 1000]). Le rectangle doit couvrir au moins un quart de l'image. Renvoie null seulement si le texte recouvre le produit lui-même ou si l'image n'a pas de texte.
- note : 8 mots maximum.`;

async function shrinkForVision(buf) {
  return sharp(buf).resize(640, 640, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
}

/** [ymin,xmin,ymax,xmax] 0-1000 valide, sinon null. */
export function parseBox(b) {
  if (!Array.isArray(b) || b.length !== 4) return null;
  const [y0, x0, y1, x1] = b.map(Number);
  if ([y0, x0, y1, x1].some((n) => !Number.isFinite(n))) return null;
  const c = (n) => Math.min(1000, Math.max(0, n));
  const box = [c(y0), c(x0), c(y1), c(x1)];
  return box[2] > box[0] && box[3] > box[1] ? box : null;
}

/** Découpe la zone « sans texte » d'une image. Refus si elle est trop petite (< 25 % de l'image ou < 400 px de côté). */
export async function cropToCleanBox(buf, box) {
  if (!box) return null;
  const { width, height } = await sharp(buf).metadata();
  const left = Math.round((box[1] / 1000) * width);
  const top = Math.round((box[0] / 1000) * height);
  const w = Math.round(((box[3] - box[1]) / 1000) * width);
  const h = Math.round(((box[2] - box[0]) / 1000) * height);
  if (w < 400 || h < 400 || (w * h) / (width * height) < 0.25) return null;
  return sharp(buf).extract({ left, top, width: Math.min(w, width - left), height: Math.min(h, height - top) }).toBuffer();
}

export function parseClassification(text, count) {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) throw new Error(`réponse sans tableau JSON : ${text.slice(0, 200)}`);
  const arr = JSON.parse(m[0]);
  const idx = arr.map((o) => Number(o?.index));
  // Les modèles numérotent parfois à partir de 1, ou omettent l'index : on se rabat sur l'ordre du tableau.
  const zeroBased = idx.length > 0 && idx.every((n, i) => n === i);
  const byIndex = new Map(arr.map((o, i) => [zeroBased ? Number(o.index) : i, o]));
  const bool = (v) => v === true || v === 'true';
  return Array.from({ length: count }, (_, i) => {
    const o = byIndex.get(i) || {};
    return {
      index: i,
      usable: bool(o.usable),
      kind: typeof o.kind === 'string' ? o.kind : 'other',
      text: ['none', 'light', 'heavy'].includes(o.text) ? o.text : 'heavy',
      watermark: bool(o.watermark),
      score: Math.min(5, Math.max(1, Number(o.score) || 1)),
      cleanBox: parseBox(o.clean_box),
      note: typeof o.note === 'string' ? o.note.slice(0, 80) : '',
    };
  });
}

async function classifyWithClaude(buffers, { apiKey, model } = {}) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY absente');
  const content = [];
  for (let i = 0; i < buffers.length; i++) {
    const small = await shrinkForVision(buffers[i]);
    content.push({ type: 'text', text: `Image ${i} :` });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: small.toString('base64') } });
  }
  content.push({ type: 'text', text: CLASSIFY_PROMPT });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: model || process.env.ANTHROPIC_VISION_MODEL || 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content }],
    }),
    signal: AbortSignal.timeout(120000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Anthropic ${res.status} : ${data?.error?.message || 'erreur'}`);
  return parseClassification(data.content?.map((c) => c.text || '').join('') || '', buffers.length);
}

async function classifyWithGemini(buffers, { apiKey, model } = {}) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY absente');
  const mdl = model || process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash';
  const parts = [];
  for (let i = 0; i < buffers.length; i++) {
    const small = await shrinkForVision(buffers[i]);
    parts.push({ text: `Image ${i} :` });
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: small.toString('base64') } });
  }
  parts.push({ text: CLASSIFY_PROMPT });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0, maxOutputTokens: 8000, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } },
    }),
    signal: AbortSignal.timeout(120000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status} : ${data?.error?.message || 'erreur'}`);
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) throw new Error(`Gemini : réponse vide (${data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'inconnue'})`);
  return parseClassification(text, buffers.length);
}

/** Fournisseur de vision : PHOTO_VISION_PROVIDER=claude|gemini, sinon Claude si ANTHROPIC_API_KEY, sinon Gemini. */
export function visionProvider(env = process.env) {
  const forced = (env.PHOTO_VISION_PROVIDER || '').toLowerCase();
  if (forced === 'gemini' && env.GEMINI_API_KEY) return 'gemini';
  if (forced === 'claude' && env.ANTHROPIC_API_KEY) return 'claude';
  if (env.ANTHROPIC_API_KEY) return 'claude';
  if (env.GEMINI_API_KEY) return 'gemini';
  return null;
}

export async function classifyImages(buffers, opts = {}) {
  const provider = opts.provider || visionProvider();
  if (provider === 'gemini') return classifyWithGemini(buffers, opts);
  if (provider === 'claude') return classifyWithClaude(buffers, opts);
  throw new Error('aucune clé de vision (ANTHROPIC_API_KEY ou GEMINI_API_KEY)');
}

// ─── Choix des 5 photos ─────────────────────────────────────────────────────

/** Ordre : couverture = meilleure photo sur fond blanc (sinon la meilleure mise en situation), puis variété (max 2 par type). */
export function pickBest(items, n = MAX_PHOTOS) {
  const ok = items.filter((x) => x.usable && !REJECT_KINDS.has(x.kind) && x.text !== 'heavy' && x.kind !== 'infographic');
  const byScore = (a, b) => b.score - a.score || a.index - b.index;
  const chosen = [];
  const cover =
    [...ok].filter((x) => x.kind === 'product_white').sort(byScore)[0] ||
    [...ok].filter((x) => x.kind === 'product_in_use').sort(byScore)[0] ||
    [...ok].sort(byScore)[0];
  if (cover) chosen.push(cover);
  const count = (k) => chosen.filter((c) => c.kind === k).length;
  for (const x of [...ok].sort(byScore)) {
    if (chosen.length >= n) break;
    if (chosen.includes(x) || count(x.kind) >= 2) continue;
    chosen.push(x);
  }
  for (const x of [...ok].sort(byScore)) {
    if (chosen.length >= n) break;
    if (!chosen.includes(x)) chosen.push(x);
  }
  return chosen;
}

// ─── Cloudinary (envoi signé, même logique que app/api/upload/route.ts) ─────

export async function uploadToCloudinary(buffer, publicId, { cloudName, apiKey, apiSecret } = {}) {
  const cn = cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const key = apiKey || process.env.CLOUDINARY_API_KEY;
  const secret = apiSecret || process.env.CLOUDINARY_API_SECRET;
  if (!cn || !key || !secret) throw new Error('Cloudinary non configuré (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)');
  const folder = 'products';
  const timestamp = Math.round(Date.now() / 1000);
  // Paramètres signés, triés par clé.
  const toSign = `folder=${folder}&overwrite=true&public_id=${publicId}&timestamp=${timestamp}${secret}`;
  const signature = createHash('sha1').update(toSign).digest('hex');
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'image/jpeg' }), `${publicId}.jpg`);
  form.append('api_key', key);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('folder', folder);
  form.append('public_id', publicId);
  form.append('overwrite', 'true');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cn}/image/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
  const data = await res.json();
  if (!res.ok) throw new Error(`Cloudinary : ${data?.error?.message || res.status}`);
  return { public_id: data.public_id, url: data.secure_url };
}

// ─── Orchestration pour un produit ──────────────────────────────────────────

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    })
  );
  return out;
}

/**
 * @param {{aliexpress_id:string, image_url?:string|null, image_urls?:string[]}} row
 * @param {{dryRun?:boolean, outDir?:string, upload?:Function, classify?:Function}} opts
 * @returns {{photos:object[], report:object, previews:{name:string,buffer:Buffer}[]}}
 */
export async function processProduct(row, opts = {}) {
  const report = { fetched: 0, failed: [], tooSmall: 0, duplicates: 0, rejected: [], classified: false, warnings: [] };
  let urls = (row.image_urls || []).map(normalizeImageUrl).filter(Boolean);
  if (!urls.length) {
    try {
      const page = await (opts.fetchPage || fetchItemPage)(row.aliexpress_id);
      urls = [...page.gallery, ...page.description];
      report.urlsFrom = `page produit (${page.gallery.length} galerie + ${page.description.length} description)`;
    } catch (e) {
      report.warnings.push(`page produit : ${e.message}`);
    }
  } else {
    report.urlsFrom = 'image_urls';
  }
  if (!urls.length && row.image_url) urls = [normalizeImageUrl(row.image_url)].filter(Boolean);
  urls = [...new Set(urls)].slice(0, 14);
  if (!urls.length) throw new Error('aucune URL de photo (renseigner image_urls)');

  const downloaded = (
    await mapLimit(urls, 4, async (url) => {
      try {
        return { url, buf: await fetchBuffer(url) };
      } catch (e) {
        report.failed.push({ url, error: e.message });
        return null;
      }
    })
  ).filter(Boolean);
  report.fetched = downloaded.length;

  const sized = [];
  for (const d of downloaded) {
    try {
      const m = await sharp(d.buf).metadata();
      if (Math.min(m.width || 0, m.height || 0) < MIN_SIDE) report.tooSmall++;
      else sized.push(d);
    } catch (e) {
      report.failed.push({ url: d.url, error: `image illisible (${e.message})` });
    }
  }
  const unique = await dedupe(sized);
  report.duplicates = sized.length - unique.length;
  if (!unique.length) throw new Error('aucune image exploitable après tri de taille');

  let verdicts;
  if (opts.classify !== false && (opts.classify || visionProvider())) {
    const classify = typeof opts.classify === 'function' ? opts.classify : classifyImages;
    verdicts = await classify(unique.map((u) => u.buf));
    report.classified = true;
    report.provider = typeof opts.classify === 'function' ? 'test' : visionProvider();
  } else {
    report.warnings.push('Images non triées (aucune clé ANTHROPIC_API_KEY / GEMINI_API_KEY) : à vérifier une par une.');
    verdicts = unique.map((_, i) => ({ index: i, usable: true, kind: 'other', text: 'none', watermark: false, score: 3, note: 'non classée' }));
  }
  // Images avec beaucoup de texte : on découpe la zone sans texte (jamais de retouche des pixels).
  if (report.classified) {
    for (const v of verdicts) {
      if (!v.usable || v.text !== 'heavy') continue;
      const cropped = await cropToCleanBox(unique[v.index].buf, v.cleanBox);
      if (!cropped) continue;
      unique[v.index] = { ...unique[v.index], buf: cropped };
      v.text = 'none';
      v.cropped = true;
      if (v.kind === 'infographic') v.kind = 'detail';
    }
    report.cropped = verdicts.filter((v) => v.cropped).length;
  }
  for (const v of verdicts) {
    if (!v.usable) report.rejected.push({ url: unique[v.index].url, kind: v.kind, text: v.text, note: v.note });
  }
  if (opts.debugDir) {
    mkdirSync(opts.debugDir, { recursive: true });
    for (const v of verdicts) writeFileSync(join(opts.debugDir, `${String(v.index).padStart(2, '0')}-${v.kind}-${v.usable ? 'ok' : 'ecartee'}${v.cropped ? '-recadree' : ''}.jpg`), unique[v.index].buf);
    writeFileSync(join(opts.debugDir, 'verdicts.json'), JSON.stringify({ report, verdicts: verdicts.map((v) => ({ ...v, source: unique[v.index].url })) }, null, 2));
  }
  const chosen = report.classified ? pickBest(verdicts) : verdicts.slice(0, MAX_PHOTOS);
  if (chosen.length < MIN_PHOTOS) {
    const detail = verdicts.map((v) => `#${v.index} ${v.usable ? 'ok' : 'écartée'} ${v.kind}/texte ${v.text}${v.cropped ? ' (recadrée)' : v.cleanBox ? ' (zone propre refusée : trop petite)' : ''}${v.note ? ' — ' + v.note : ''}`).join(' | ');
    throw new Error(`seulement ${chosen.length} photo(s) exploitable(s) (minimum ${MIN_PHOTOS}). Verdicts : ${detail}`);
  }

  const photos = [];
  const previews = [];
  for (let i = 0; i < chosen.length; i++) {
    const v = chosen[i];
    const src = unique[v.index];
    const sq = await toSquareJpeg(src.buf);
    const flags = [...sq.flags];
    if (v.watermark) flags.push('filigrane');
    if (v.text === 'light') flags.push('texte_leger');
    if (v.cropped) flags.push('recadree_sans_texte');
    if (!report.classified) flags.push('non_classee');
    const name = `ae-${row.aliexpress_id}-${i + 1}`;
    previews.push({ name: `${String(i + 1).padStart(2, '0')}-${v.kind}.jpg`, buffer: sq.buffer });
    let up = { public_id: `products/${name}`, url: null };
    if (!opts.dryRun) up = await (opts.upload || uploadToCloudinary)(sq.buffer, name);
    photos.push({ public_id: up.public_id, url: up.url, kind: v.kind, text: v.text, watermark: v.watermark, mode: sq.mode, score: v.score, source: src.url, flags });
  }
  return { photos, report, previews };
}
