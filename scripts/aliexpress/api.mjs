// API officielle AliExpress Affiliate (Open Platform) : fiche produit par pays, lien affilié, vérification du lien.
// Pur Node, aucune dépendance : réutilisable par les scripts du serveur (photos, cron hebdomadaire…).
// Variables d'environnement (.env.local du serveur, jamais dans git) :
//   ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET, ALIEXPRESS_TRACKING_ID
import { createHash, createHmac } from 'node:crypto';

const GATEWAY = 'https://api-sg.aliexpress.com/sync';
/** Ancienne passerelle « TOP » (applications à clé de 6 chiffres) : MD5, date de Shanghai, v=2.0, format=json. */
export const TOP_GATEWAY = 'http://gw.api.taobao.com/router/rest';

/** Paramètres de l'API par marché : pays de livraison, devise et langue des textes. */
export const MARKET_PARAMS = {
  fr: { country: 'FR', currency: 'EUR', language: 'FR' },
  es: { country: 'ES', currency: 'EUR', language: 'ES' },
  uk: { country: 'GB', currency: 'GBP', language: 'EN' },
};

// ─── Signature ──────────────────────────────────────────────────────────────

/**
 * Signature des requêtes. sha256 (défaut) : HMAC-SHA256 du secret sur « nomvaleur » triés par nom, en majuscules hexadécimales.
 * md5 : MD5(secret + chaîne + secret). `prefix` : chemin d'API ajouté devant la chaîne (API de type REST).
 */
export function signParams(params, secret, method = 'sha256', prefix = '') {
  const base =
    prefix +
    Object.keys(params)
      .filter((k) => k !== 'sign' && params[k] !== undefined && params[k] !== null && params[k] !== '')
      .sort()
      .map((k) => `${k}${params[k]}`)
      .join('');
  if (method === 'md5') return createHash('md5').update(secret + base + secret, 'utf8').digest('hex').toUpperCase();
  return createHmac('sha256', secret).update(base, 'utf8').digest('hex').toUpperCase();
}

/** Retire espaces, retours chariot et guillemets autour d'une valeur lue dans .env.local. */
const clean = (v) => (v == null ? v : String(v).trim().replace(/^["']|["']$/g, '').trim());

export function getCredentials(env = process.env) {
  const appKey = clean(env.ALIEXPRESS_APP_KEY);
  const appSecret = clean(env.ALIEXPRESS_APP_SECRET);
  const trackingId = clean(env.ALIEXPRESS_TRACKING_ID);
  const missing = [!appKey && 'ALIEXPRESS_APP_KEY', !appSecret && 'ALIEXPRESS_APP_SECRET', !trackingId && 'ALIEXPRESS_TRACKING_ID'].filter(Boolean);
  if (missing.length) throw new Error(`variables manquantes dans .env.local : ${missing.join(', ')}`);
  return { appKey, appSecret, trackingId };
}

/**
 * Variantes de signature essayées par `probe.mjs --variants`. Le format de référence est celui du kit officiel
 * (kit « python-aliexpress-api ») : MD5, horodatage en ms, avec v=2.0, format=json et partner_id=top-apitools.
 */
export const SIGN_VARIANTS = [
  { name: 'sync · sha256 · tout dans l\'adresse (GET)', gateway: GATEWAY, signMethod: 'sha256', timestampUnit: 'ms', extras: false, transport: 'query' },
  { name: 'sync · sha256 · système dans l\'adresse, le reste dans le corps', gateway: GATEWAY, signMethod: 'sha256', timestampUnit: 'ms', extras: false, transport: 'split' },
  { name: 'sync · md5 · v/format/partner_id · GET', gateway: GATEWAY, signMethod: 'md5', timestampUnit: 'ms', extras: 'full', transport: 'query' },
  { name: 'sync · md5 · v/format/partner_id · système dans l\'adresse', gateway: GATEWAY, signMethod: 'md5', timestampUnit: 'ms', extras: 'full', transport: 'split' },
  { name: 'TOP (http) · md5 + date Shanghai · POST', gateway: TOP_GATEWAY, signMethod: 'md5', timestampUnit: 'datetime', extras: 'top', transport: 'body' },
  { name: 'TOP (http) · md5 + date Shanghai · GET', gateway: TOP_GATEWAY, signMethod: 'md5', timestampUnit: 'datetime', extras: 'top', transport: 'query' },
  { name: 'sync · sha256 · POST dans le corps (essai initial)', gateway: GATEWAY, signMethod: 'sha256', timestampUnit: 'ms', extras: false, transport: 'body' },
];

const EXTRAS = {
  full: { v: '2.0', format: 'json', partner_id: 'top-apitools' },
  top: { v: '2.0', format: 'json' },
  v: { v: '2.0' },
};

function formatTimestamp(unit, ms) {
  if (unit === 's') return String(Math.floor(ms / 1000));
  if (unit === 'datetime') return new Date(ms + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  return String(ms);
}

let lastCallAt = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Appel API avec cadence minimale (vrai réseau seulement) et nouvel essai quand AliExpress répond ApiCallLimit. */
export async function callApi(method, params, opts = {}) {
  const { retries = 3, minGapMs = 500, sleepImpl = sleep } = opts;
  const real = (opts.fetchImpl || fetch) === fetch;
  for (let attempt = 0; ; attempt++) {
    if (real && minGapMs) {
      const wait = lastCallAt + minGapMs - Date.now();
      if (wait > 0) await sleepImpl(wait);
    }
    lastCallAt = Date.now();
    try {
      return await callOnce(method, params, opts);
    } catch (e) {
      if (attempt >= retries || !/ApiCallLimit|frequency exceeds/i.test(String(e.message))) throw e;
      await sleepImpl(1500 * (attempt + 1));
    }
  }
}

async function callOnce(method, params, { creds, fetchImpl = fetch, now = Date.now, signMethod = 'md5', timestampUnit = 'ms', extras = 'full', gateway = GATEWAY, transport = 'body' } = {}) {
  const c = creds || getCredentials();
  const all = {
    app_key: c.appKey,
    timestamp: formatTimestamp(timestampUnit, now()),
    sign_method: signMethod,
    method,
    ...(EXTRAS[extras === true ? 'full' : extras] || {}),
    ...params,
  };
  all.sign = signParams(all, c.appSecret, signMethod);
  const SYSTEM = new Set(['app_key', 'timestamp', 'sign_method', 'sign', 'method', 'v', 'format', 'partner_id']);
  let url = gateway;
  let init = {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(all).toString(),
    signal: AbortSignal.timeout(30000),
  };
  if (transport === 'query') {
    url = `${gateway}?${new URLSearchParams(all).toString()}`;
    init = { method: 'GET', signal: AbortSignal.timeout(30000) };
  } else if (transport === 'split') {
    const sys = Object.fromEntries(Object.entries(all).filter(([k]) => SYSTEM.has(k)));
    const biz = Object.fromEntries(Object.entries(all).filter(([k]) => !SYSTEM.has(k)));
    url = `${gateway}?${new URLSearchParams(sys).toString()}`;
    init = { ...init, body: new URLSearchParams(biz).toString() };
  }
  const res = await fetchImpl(url, init);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`réponse non JSON (HTTP ${res.status}) : ${text.slice(0, 200)}`);
  }
  if (json.error_response) {
    const e = json.error_response;
    throw new Error(`API AliExpress : ${e.code || ''} ${e.msg || e.sub_msg || 'erreur'}`.trim());
  }
  return json;
}

// ─── Lecture des réponses ───────────────────────────────────────────────────

const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const num = (v) => {
  const n = Number(String(v ?? '').replace(',', '.').replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) && String(v ?? '') !== '' ? n : null;
};
/** « 7.0% » ou « 7 » → 0.07 ; « 0.5% » → 0.005 ; « 1% » → 0.01 (un « % » veut toujours dire pourcentage). Un nombre sans « % » ≤ 1 est déjà une fraction. */
export function parseRate(v) {
  const n = num(v);
  if (n === null) return null;
  if (typeof v === 'string' && v.includes('%')) return Math.round(n * 100) / 10000;
  return n > 1 ? Math.round(n * 100) / 10000 : n;
}

/** Réponse de aliexpress.affiliate.productdetail.get → fiche normalisée (ou null si le produit est absent). */
export function parseProductDetail(json, wantedId) {
  const root = json?.aliexpress_affiliate_productdetail_get_response?.resp_result;
  if (!root) throw new Error('réponse inattendue (resp_result absent)');
  if (String(root.resp_code) !== '200') throw new Error(`API AliExpress : ${root.resp_code} ${root.resp_msg || ''}`.trim());
  const products = list(root.result?.products?.product);
  const p = products.find((x) => String(x.product_id) === String(wantedId)) || products[0];
  if (!p) return null;
  return {
    productId: String(p.product_id),
    title: p.product_title || null,
    promotionLink: p.promotion_link || null,
    productUrl: p.product_detail_url || null,
    price: num(p.target_sale_price),
    originalPrice: num(p.target_original_price),
    currency: p.target_sale_price_currency || null,
    commissionRate: parseRate(p.commission_rate),
    shopName: p.shop_name || null,
    shopUrl: p.shop_url || null,
    ratingPercent: num(p.evaluate_rate),
    sales: num(p.lastest_volume),
    mainImage: p.product_main_image_url || null,
    images: list(p.product_small_image_urls?.string),
    videoUrl: p.product_video_url || null,
    category: p.first_level_category_name || null,
  };
}

/** Réponse de aliexpress.affiliate.link.generate → liens affiliés par adresse source. */
export function parseLinkGenerate(json) {
  const root = json?.aliexpress_affiliate_link_generate_response?.resp_result;
  if (!root) throw new Error('réponse inattendue (resp_result absent)');
  if (String(root.resp_code) !== '200') throw new Error(`API AliExpress : ${root.resp_code} ${root.resp_msg || ''}`.trim());
  return list(root.result?.promotion_links?.promotion_link).map((l) => ({ source: l.source_value, link: l.promotion_link }));
}

// ─── Appels ─────────────────────────────────────────────────────────────────

/** Fiche produit telle que vue depuis un marché (pays de livraison, devise, langue) + lien affilié du suivi. */
export async function getProductForMarket(productId, market, opts = {}) {
  const m = MARKET_PARAMS[market];
  if (!m) throw new Error(`marché inconnu : ${market}`);
  const c = opts.creds || getCredentials();
  const json = await callApi(
    'aliexpress.affiliate.productdetail.get',
    {
      product_ids: String(productId),
      fields: 'commission_rate,sale_price,original_price,product_main_image_url,product_small_image_urls,product_video_url,evaluate_rate,lastest_volume,shop_name,shop_url,first_level_category_name',
      country: m.country,
      target_currency: m.currency,
      target_language: m.language,
      tracking_id: c.trackingId,
    },
    { ...opts, creds: c }
  );
  return parseProductDetail(json, productId);
}

/** Génère un lien affilié pour une adresse produit (type 0 = lien normal). */
export async function generateLink(url, opts = {}) {
  const c = opts.creds || getCredentials();
  const json = await callApi(
    'aliexpress.affiliate.link.generate',
    { promotion_link_type: '0', source_values: url, tracking_id: c.trackingId },
    { ...opts, creds: c }
  );
  return parseLinkGenerate(json)[0]?.link || null;
}

// ─── Vérification d'un lien affilié ─────────────────────────────────────────

/** Identifiant produit contenu dans une adresse AliExpress (item/123.html, productId=123, redirectUrl=…). */
export function extractProductId(url) {
  if (!url) return null;
  let s = String(url);
  try {
    const u = new URL(s);
    for (const k of ['redirectUrl', 'redirect_url', 'url']) {
      const inner = u.searchParams.get(k);
      if (inner) {
        const id = extractProductId(inner);
        if (id) return id;
      }
    }
    for (const k of ['productId', 'productIds', 'product_id']) {
      const v = u.searchParams.get(k);
      if (v && /^\d{8,}$/.test(v)) return v;
    }
    s = u.pathname;
  } catch {
    /* adresse relative : on cherche directement */
  }
  const m = s.match(/\/(?:item|i)\/(\d{8,})/) || s.match(/(\d{10,})\.html/);
  return m ? m[1] : null;
}

/** Suit les redirections du lien affilié (sans ouvrir la page) et renvoie l'identifiant produit atteint. */
export async function resolveLink(link, { fetchImpl = fetch, maxHops = 8 } = {}) {
  let url = link;
  const trail = [];
  for (let i = 0; i < maxHops; i++) {
    trail.push(url);
    const direct = extractProductId(url);
    if (direct) return { productId: direct, finalUrl: url, trail };
    const res = await fetchImpl(url, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(20000),
    });
    const loc = res.headers.get('location');
    if (!loc || res.status < 300 || res.status >= 400) return { productId: extractProductId(res.url) || null, finalUrl: res.url || url, trail };
    url = new URL(loc, url).toString();
  }
  return { productId: null, finalUrl: url, trail };
}

/**
 * Contrôles de sécurité avant d'enregistrer un lien : même produit, devise attendue, prix proche de celui relevé.
 * `expected` : { productId, currency, price? (prix relevé à la recherche), tolerance? (0.25 = ±25 %) }
 * Renvoie { ok, checks: [{name, ok, detail}] }.
 */
export async function verifyAffiliateLink({ link, detail, expected, fetchImpl }) {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });
  add('lien présent', !!link, link ? 'oui' : 'aucun lien renvoyé par AliExpress');
  add('fiche trouvée', !!detail, detail ? detail.title?.slice(0, 60) || detail.productId : 'produit introuvable pour ce pays');
  if (link && detail) {
    add('identifiant produit (API)', detail.productId === String(expected.productId), `${detail.productId} / attendu ${expected.productId}`);
    let resolved = null;
    try {
      resolved = await resolveLink(link, { fetchImpl });
      add('le lien mène au bon produit', resolved.productId === String(expected.productId), `${resolved.productId || 'identifiant non trouvé'} / attendu ${expected.productId}`);
    } catch (e) {
      add('le lien mène au bon produit', false, `redirection illisible : ${e.message}`);
    }
    if (expected.currency) add('devise du marché', detail.currency === expected.currency, `${detail.currency} / attendu ${expected.currency}`);
    if (expected.price && detail.price) {
      const tol = expected.tolerance ?? 0.25;
      const gap = Math.abs(detail.price - expected.price) / expected.price;
      add('prix cohérent avec la recherche', gap <= tol, `${detail.price} ${detail.currency || ''} vs ${expected.price} (écart ${(gap * 100).toFixed(0)} %)`);
    }
  }
  return { ok: checks.every((c) => c.ok), checks };
}
