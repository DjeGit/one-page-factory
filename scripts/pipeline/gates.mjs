// Contrôles de qualité du flux automatique (fonctions pures, testées sans réseau ni base).

export const MIN_RATING = 4;
export const MAX_PRICE_GAP = 0.2; // écart maximal entre le prix du jour de la recherche et celui de l'API
export const FIRST_PUBLISH_DELAY_H = 24;
// Produits pour enfants : marquage CE et normes à vérifier à la main avant toute mise en ligne.
const MANUAL_REVIEW = { puericulture: 'produit pour bébé : vérifier le marquage CE et les normes', 'jeux-jouets': 'jouet : vérifier le marquage CE et les normes' };

/** Raisons pour lesquelles un candidat ne peut pas entrer dans le flux ; liste vide = accepté. */
export function checkCandidate(c) {
  const reasons = [];
  if (c.rating == null || Number(c.rating) < MIN_RATING) reasons.push(`note ${c.rating ?? 'absente'} : minimum ${MIN_RATING}`);
  if (!c.aliexpress_id) reasons.push('identifiant AliExpress manquant');
  return reasons;
}

export function needsManualReview(categorySlug) {
  return MANUAL_REVIEW[categorySlug] || null;
}

/** Écart relatif |actual - expected| / expected, ou null si une des valeurs manque. */
export function priceGap(expected, actual) {
  const e = Number(expected);
  const a = Number(actual);
  if (!Number.isFinite(e) || !Number.isFinite(a) || e <= 0) return null;
  return Math.abs(a - e) / e;
}

/** Lien AliExpress « neutre » (page produit) : ce n'est pas un lien affilié. */
export function isNeutralAliexpressUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(String(url).trim());
    return /(^|\.)aliexpress\.[a-z.]+$/i.test(u.hostname) && /^\/(item|i)\//.test(u.pathname);
  } catch {
    return false;
  }
}

/** Raisons pour lesquelles une fiche ne doit pas être mise en ligne ; liste vide = prête (même règle que lib/market-sync.ts). */
export function publishIssues(p) {
  const issues = [];
  if (!p.affiliate_url || !String(p.affiliate_url).trim()) issues.push('lien affilié manquant');
  else if (isNeutralAliexpressUrl(p.affiliate_url)) issues.push('lien affilié encore neutre (page AliExpress)');
  if (!(p.images && p.images.length > 0) && !p.image_url) issues.push('aucune photo');
  if (!p.price || !p.price_checked_at) issues.push('prix ou date du relevé manquant');
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

/** Colonne « livraison gratuite » du classeur (texte libre) → booléen. */
export function parseFreeShipping(v) {
  return /^\s*(oui|yes|s[ií]|true|1|gratuit|free|gratis)/i.test(String(v ?? ''));
}
