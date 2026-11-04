// Contrôles de qualité du flux automatique (fonctions pures, testées sans réseau ni base).

export const MIN_RATING = 4;
export const MAX_PRICE_GAP = 0.2; // écart maximal entre le prix du jour de la recherche et celui de l'API
export const FIRST_PUBLISH_DELAY_H = 24;
export const MIN_PHOTOS = 3; // même minimum que scripts/photos/pipeline.mjs
// Produits pour enfants : marquage CE et normes à vérifier à la main avant toute mise en ligne.
const MANUAL_REVIEW = { puericulture: 'produit pour bébé : vérifier le marquage CE et les normes', 'jeux-jouets': 'jouet : vérifier le marquage CE et les normes' };
// Un produit pour enfant peut être rangé dans une autre catégorie (ex. « montre enfant » en Tech) : on repère aussi les mots du nom.
const CHILD_WORDS = /\b(bebes?|enfants?|jouets?|poussettes?|biberons?|puericultur\w*|kids?|child|children|toys?|baby|babies|infants?|ninos?|ninas?|juguetes?|infantil\w*)\b/;

const plain = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Raisons pour lesquelles un candidat ne peut pas entrer dans le flux ; liste vide = accepté. */
export function checkCandidate(c) {
  const reasons = [];
  const rating = Number(c.rating);
  if (c.rating == null || c.rating === '' || !Number.isFinite(rating)) reasons.push(`note ${c.rating == null || c.rating === '' ? 'absente' : `illisible (${c.rating})`} : minimum ${MIN_RATING}`);
  else if (rating < MIN_RATING) reasons.push(`note ${c.rating} : minimum ${MIN_RATING}`);
  if (!c.aliexpress_id) reasons.push('identifiant AliExpress manquant');
  else if (!/^\d{6,}$/.test(String(c.aliexpress_id))) reasons.push(`identifiant AliExpress invalide (${String(c.aliexpress_id).slice(0, 30)})`);
  return reasons;
}

/**
 * Motif de blocage de la mise en ligne automatique (produit pour enfant), ou null.
 * @param {string} categorySlug
 * @param {...string} texts  nom, type de produit… (repère les mots « enfant », « jouet », « bébé »…)
 */
export function needsManualReview(categorySlug, ...texts) {
  if (MANUAL_REVIEW[categorySlug]) return MANUAL_REVIEW[categorySlug];
  const hit = plain(texts.filter(Boolean).join(' ')).match(CHILD_WORDS);
  return hit ? `le nom parle d'enfant ou de bébé (« ${hit[0]} ») : vérifier le marquage CE et les normes` : null;
}

/** Écart relatif |actual - expected| / expected, ou null si une des valeurs manque. */
export function priceGap(expected, actual) {
  const e = Number(expected);
  const a = Number(actual);
  if (expected == null || actual == null || !Number.isFinite(e) || !Number.isFinite(a) || e <= 0) return null;
  return Math.abs(a - e) / e;
}

const ALIEXPRESS_HOST = /(^|\.)aliexpress\.[a-z.]+$/i;

/** Lien AliExpress « neutre » (page produit) : ce n'est pas un lien affilié. */
export function isNeutralAliexpressUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(String(url).trim());
    return ALIEXPRESS_HOST.test(u.hostname) && /^\/(item|i)\//.test(u.pathname);
  } catch {
    return false;
  }
}

/** Lien https vers un domaine AliExpress (s.click.aliexpress.com, a.aliexpress.com…). */
export function isAliexpressLink(url) {
  try {
    const u = new URL(String(url).trim());
    return u.protocol === 'https:' && ALIEXPRESS_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Raisons pour lesquelles une fiche ne doit pas être mise en ligne ; liste vide = prête.
 * Par défaut, même règle que lib/market-sync.ts (activation à la main). Le flux automatique est plus strict :
 * `minPhotos` (nombre minimal de photos), `aliexpressOnly` (le lien doit être un lien AliExpress), `now` (le prix doit être daté du jour).
 * @param {object} p
 * @param {{minPhotos?:number, aliexpressOnly?:boolean, now?:Date}} [opts]
 */
export function publishIssues(p, { minPhotos = 0, aliexpressOnly = false, now } = {}) {
  const issues = [];
  if (!p.affiliate_url || !String(p.affiliate_url).trim()) issues.push('lien affilié manquant');
  else if (isNeutralAliexpressUrl(p.affiliate_url)) issues.push('lien affilié encore neutre (page AliExpress)');
  else if (aliexpressOnly && !isAliexpressLink(p.affiliate_url)) issues.push('lien affilié qui ne mène pas à AliExpress (https)');
  const count = p.images?.length || 0;
  if (!count && !p.image_url) issues.push('aucune photo');
  else if (minPhotos && count < minPhotos) issues.push(`seulement ${count} photo(s) (minimum ${minPhotos})`);
  if (!p.price || !(Number(p.price) > 0) || !p.price_checked_at) issues.push('prix ou date du relevé manquant');
  else if (now && isPriceStale(p.price_checked_at, now)) issues.push('prix relevé un autre jour : à revérifier');
  return issues;
}

/** 1re fiche du flux : 24 h de délai ; ensuite mise en ligne immédiate une fois les contrôles verts. */
export function computePublishAt(now, liveCount) {
  const t = new Date(now);
  if (!liveCount) t.setTime(t.getTime() + FIRST_PUBLISH_DELAY_H * 3600 * 1000);
  return t;
}

/** Le prix a été relevé un autre jour que « maintenant » (Madrid) : on le revérifie avant de l'afficher. */
export function isPriceStale(priceCheckedAt, now) {
  if (!priceCheckedAt) return true;
  const today = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  return String(priceCheckedAt).slice(0, 10) !== today;
}

const YES = /^(oui|yes|s[ií]|true|1|gratuit(e)?|gratis|free|livraison gratuite|free shipping|env[ií]o gratis|env[ií]o gratuito)\s*[.!]?$/i;
const NO = /^(non|no|0|false|payant|payante|paid)\s*[.!]?$/i;

/** Colonne « livraison gratuite » (texte libre) → true (gratuite) / false (payante) / null (absent ou ambigu : « Oui dès 20 € »…). */
export function parseShippingValue(v) {
  const s = String(v ?? '').trim();
  if (YES.test(s)) return true;
  if (NO.test(s)) return false;
  return null;
}

/**
 * Colonne « livraison gratuite » du classeur → booléen. Seule une réponse sans condition compte comme gratuite :
 * « Oui », « Gratuite », « Free shipping »… ; « Oui dès 20 € » ou « Sin envío gratuito » donnent faux (jamais « gratuite » à tort).
 */
export const parseFreeShipping = (v) => parseShippingValue(v) === true;

/** État de la livraison gratuite d'une fiche : 'free' | 'paid' (relevée payante) | 'unknown' (non relevée ou ambiguë : à vérifier). */
export function shippingState(candidateValue, productFree) {
  if (productFree === true) return 'free';
  return parseShippingValue(candidateValue) === false ? 'paid' : 'unknown';
}
