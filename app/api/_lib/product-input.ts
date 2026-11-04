/**
 * Validation des champs d'une fiche produit reçus par l'API admin
 * (création et modification). Fonction pure, testée dans tests/api-products-validation.test.ts.
 *
 * Principes :
 *  - champs protégés (id, dates, code de redirection) jamais modifiables par l'API ;
 *  - un marché valide est fr / es / uk (lib/market.ts) ;
 *  - livraison gratuite = booléen, vidéo = lien YouTube uniquement (lib/video.ts),
 *    identifiant AliExpress = chiffres uniquement ;
 *  - les champs inconnus passent tels quels (la base les refusera s'ils n'existent pas) :
 *    on ne casse donc aucun formulaire existant, on bloque seulement les valeurs fausses.
 */
import { isValidMarket } from '@/lib/market';
import { getYouTubeId } from '@/lib/video';

/** Colonnes qu'aucun appel API ne doit pouvoir écrire. */
const PROTECTED_KEYS = ['id', 'created_at', 'updated_at', 'redirect_code', 'category', 'categories', 'sync'];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALIEXPRESS_ID_RE = /^\d{8,20}$/;
const PRODUCT_SOURCES = ['auto_discovered', 'manual_affiliate', 'own_product'];

const MAX_TEXT = 20000;

export type ProductInputResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

function isHttpUrl(value: string): boolean {
  if (value.length > 2000) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function fail(error: string): ProductInputResult {
  return { ok: false, error };
}

/** Nombre fini >= 0 (ou null) ; sinon undefined. */
function numberOrNull(v: unknown, max: number): number | null | undefined {
  if (v === null || v === '') return null;
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > max) return undefined;
  return n;
}

/**
 * @param mode 'create' exige un nom et un lien d'affiliation ; 'update' accepte un envoi partiel.
 */
export function validateProductInput(input: Record<string, unknown>, mode: 'create' | 'update'): ProductInputResult {
  const data: Record<string, unknown> = { ...input };
  for (const k of PROTECTED_KEYS) delete data[k];

  // Nom
  if ('name' in data || mode === 'create') {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) return fail('Le nom du produit est requis');
    if (name.length > 300) return fail('Le nom du produit est trop long (300 caractères maximum)');
    data.name = name;
  }

  // Lien d'affiliation : requis à la création ; en modification, vide = brouillon sans lien (jamais un lien invalide)
  if (mode === 'create' || 'affiliate_url' in data) {
    const raw = typeof data.affiliate_url === 'string' ? data.affiliate_url.trim() : '';
    if (mode === 'create' && !raw) return fail("Le nom et l'URL d'affiliation sont requis");
    if (raw && !isHttpUrl(raw)) return fail("L'URL d'affiliation doit être une adresse http(s) valide");
    data.affiliate_url = raw;
  }
  for (const k of ['affiliate_url_2', 'affiliate_url_3', 'affiliate_url_fr', 'affiliate_url_es', 'affiliate_url_com']) {
    if (k in data) {
      const raw = typeof data[k] === 'string' ? (data[k] as string).trim() : '';
      if (raw && !isHttpUrl(raw)) return fail(`Adresse invalide pour ${k}`);
      data[k] = raw || null;
    }
  }

  // Slug
  if ('slug' in data) {
    if (data.slug === null || data.slug === '' || data.slug === undefined) delete data.slug;
    else if (typeof data.slug !== 'string' || data.slug.length > 120 || !SLUG_RE.test(data.slug)) {
      return fail('Slug invalide : minuscules, chiffres et tirets uniquement (ex. casque-bluetooth)');
    }
  }

  // Marché
  if ('market' in data && data.market !== undefined && data.market !== null && data.market !== '') {
    if (typeof data.market !== 'string' || !isValidMarket(data.market)) return fail('Marché invalide (fr, es ou uk)');
  } else {
    delete data.market;
  }

  // Montants
  for (const k of ['price', 'original_price', 'cost_price', 'ad_spend_allocated']) {
    if (k in data) {
      const n = numberOrNull(data[k], 10_000_000);
      if (n === undefined) return fail(`Montant invalide pour ${k}`);
      data[k] = n;
    }
  }
  if ('commission_rate' in data) {
    const n = numberOrNull(data.commission_rate, 1);
    if (n === undefined) return fail('Taux de commission invalide (fraction entre 0 et 1, ex. 0.08 pour 8 %)');
    data.commission_rate = n;
  }
  if ('price_currency' in data) {
    if (data.price_currency === '' || data.price_currency === undefined) data.price_currency = null;
    if (data.price_currency !== null && data.price_currency !== 'EUR' && data.price_currency !== 'GBP') {
      return fail('Devise invalide (EUR ou GBP)');
    }
  }
  if ('price_checked_at' in data) {
    const v = data.price_checked_at;
    if (v === null || v === '' || v === undefined) data.price_checked_at = null;
    else if (typeof v === 'string' && !Number.isNaN(Date.parse(v)) && /^\d{4}-\d{2}-\d{2}/.test(v)) data.price_checked_at = v.slice(0, 10); // colonne de type date
    else return fail('Date du relevé de prix invalide (AAAA-MM-JJ)');
  }

  // Livraison gratuite : booléen (la colonne est NOT NULL, null = non)
  if ('free_shipping' in data) {
    const v = data.free_shipping;
    if (v === null || v === undefined) data.free_shipping = false;
    else if (typeof v !== 'boolean') return fail('Livraison gratuite : valeur invalide (oui/non attendu)');
  }

  // Vidéo : lien YouTube uniquement
  if ('video_url' in data) {
    const v = data.video_url;
    if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) data.video_url = null;
    else if (typeof v !== 'string' || !getYouTubeId(v)) return fail('Lien vidéo invalide : seul un lien YouTube est accepté');
    else data.video_url = v.trim();
  }

  // Identifiant AliExpress
  if ('aliexpress_id' in data) {
    const v = data.aliexpress_id;
    if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) data.aliexpress_id = null;
    else if (typeof v === 'number') data.aliexpress_id = String(v);
    if (data.aliexpress_id !== null && !ALIEXPRESS_ID_RE.test(String(data.aliexpress_id).trim())) {
      return fail('Identifiant AliExpress invalide (8 à 20 chiffres)');
    }
    if (data.aliexpress_id !== null) data.aliexpress_id = String(data.aliexpress_id).trim();
  }

  // Références
  for (const k of ['category_id', 'source_product_ref']) {
    if (k in data) {
      const v = data[k];
      if (v === '' || v === undefined) data[k] = null;
      else if (v !== null && (typeof v !== 'string' || !UUID_RE.test(v))) return fail(`Référence invalide pour ${k}`);
    }
  }
  if ('product_source' in data && data.product_source !== null) {
    if (typeof data.product_source !== 'string' || !PRODUCT_SOURCES.includes(data.product_source)) {
      return fail('Origine du produit invalide');
    }
  }

  // Images
  if ('images' in data) {
    const imgs = data.images;
    if (imgs === null || imgs === undefined) data.images = [];
    else if (!Array.isArray(imgs) || imgs.length > 30 || imgs.some((i) => typeof i !== 'string' || i.length > 2000)) {
      return fail('Liste de photos invalide (30 maximum)');
    }
  }
  if ('image_url' in data) {
    const v = data.image_url;
    if (v === '' || v === undefined) data.image_url = null;
    else if (v !== null && (typeof v !== 'string' || v.length > 2000)) return fail("Adresse d'image invalide");
  }

  // Booléens
  for (const k of ['active', 'email_capture_enabled', 'exit_intent_enabled']) {
    if (k in data && data[k] !== undefined && typeof data[k] !== 'boolean') return fail(`Valeur invalide pour ${k} (oui/non attendu)`);
  }

  // Blocs structurés : des tableaux
  for (const k of ['pain_points', 'benefits', 'faq', 'testimonials']) {
    if (k in data && data[k] !== null && !Array.isArray(data[k])) return fail(`${k} doit être une liste`);
  }

  // Textes longs
  for (const k of ['description', 'hero_title', 'hero_subtitle', 'tiktok_script', 'meta_title', 'meta_description', 'seller_name']) {
    if (k in data && data[k] !== null && data[k] !== undefined) {
      if (typeof data[k] !== 'string') return fail(`${k} doit être un texte`);
      if ((data[k] as string).length > MAX_TEXT) return fail(`${k} est trop long`);
    }
  }

  return { ok: true, data };
}
