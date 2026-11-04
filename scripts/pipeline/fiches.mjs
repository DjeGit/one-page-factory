// Construction des lignes `products` (une par marché) à partir des offres vérifiées et des textes rédigés.
import { LANGS, fixedFaq } from './fiche-text.mjs';
import { parseFreeShipping } from './gates.mjs';

export const LANG_OF_MARKET = { fr: 'fr', es: 'es', uk: 'en' };
export { LANGS };

/** Slug propre : sans accents, minuscules, tirets. */
export function slugify(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90)
    .replace(/-$/, '');
}

/** Slug libre : ajoute -2, -3… tant qu'il est déjà pris. */
export function uniqueSlug(base, taken) {
  const root = base || 'produit';
  let s = root;
  let i = 2;
  while (taken.has(s)) s = `${root}-${i++}`;
  taken.add(s);
  return s;
}

/**
 * @param {{candidate:object, offer:object, text:object, today:string, categoryId:string|null, slug:string}} a
 * @returns {object} ligne `products` prête à insérer (brouillon, sans photos)
 */
export function buildProductRow({ candidate, offer, text, today, categoryId, slug }) {
  const market = offer.market;
  const lang = LANG_OF_MARKET[market];
  const d = offer.detail;
  return {
    name: text.name,
    slug,
    description: text.description,
    price: d.price,
    original_price: null,
    price_currency: d.currency,
    price_checked_at: today,
    free_shipping: parseFreeShipping(candidate[`free_shipping_${market}`]),
    affiliate_url: d.promotionLink,
    image_url: null,
    images: [],
    active: false,
    hero_title: text.hero_title,
    hero_subtitle: text.hero_subtitle,
    pain_points: [],
    benefits: text.benefits,
    faq: [...text.faq, ...fixedFaq(lang, d.price, today)],
    testimonials: [],
    meta_title: text.meta_title,
    meta_description: text.meta_description,
    market,
    product_source: 'manual_affiliate',
    commission_rate: d.commissionRate ?? null,
    seller_name: d.shopName || candidate.seller || null,
    video_url: null,
    category_id: categoryId,
    aliexpress_id: offer.itemId,
  };
}
