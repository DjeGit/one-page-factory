// API officielle AliExpress Affiliate (Open Platform) : fiche produit par pays, lien affilié, vérification du lien.
// Pur Node, aucune dépendance : réutilisable par les scripts du serveur (photos, cron hebdomadaire…).
// Variables d'environnement (.env.local du serveur, jamais dans git) :
//   ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET, ALIEXPRESS_TRACKING_ID
import { createHmac } from 'node:crypto';

const GATEWAY = 'https://api-sg.aliexpress.com/sync';

/** Paramètres de l'API par marché : pays de livraison, devise et langue des textes. */
export const MARKET_PARAMS = {
  fr: { country: 'FR', currency: 'EUR', language: 'FR' },
  es: { country: 'ES', currency: 'EUR', language: 'ES' },
  uk: { country: 'GB', currency: 'GBP', language: 'EN' },
};

// ─── Signature ──────────────────────────────────────────────────────────────

/** Signature HMAC-SHA256 : paramètres triés par nom, concaténés « nomvaleur », en majuscules hexadécimales. */
export function signParams(params, secret) {
  const base = Object.keys(params)
    .filter((k) => k !== 'sign' && params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join('');
  return createHmac('sha256', secret).update(base, 'utf8').digest('hex').toUpperCase();
}

export function getCredentials(env = process.env) {
  const appKey = env.ALIEXPRESS_APP_KEY;
  const appSecret = env.ALIEXPRESS_APP_SECRET;
  const trackingId = env.ALIEXPRESS_TRACKING_ID;
  const missing = [!appKey && 'ALIEXPRESS_APP_KEY', !appSecret && 'ALIEXPRESS_APP_SECRET', !trackingId && 'ALIEXPRESS_TRACKING_ID'].filter(Boolean);
  if (missing.length) throw new Error(`variables manquantes dans .env.local : ${missing.join(', ')}`);
  return { appKey, appSecret, trackingId };
}

export async function callApi(method, params, { creds, fetchImpl = fetch, now = Date.now } = {}) {
  const c = creds || getCredentials();
  const all = {
    app_key: c.appKey,
    timestamp: String(now()),
    sign_method: 'sha256',
    method,
    ...params,
  };
  all.sign = signParams(all, c.appSecret);
  const res = await fetchImpl(GATEWAY, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(all).toString(),
    signal: AbortSignal.timeout(30000),
  });
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
/** « 7.0% » ou « 7 » → 0.07 */
export function parseRate(v) {
  const n = num(v);
  return n === null ? null : n > 1 ? Math.round(n * 100) / 10000 : n;
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
