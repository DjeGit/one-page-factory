/**
 * Page Produits de l'admin : navigation par catégorie (fonctions pures, sans dépendance serveur).
 * Les compteurs et les listes portent sur le marché affiché dans l'admin (sélecteur de marché).
 */

import { MARKET_ORIGIN } from '@/lib/site-url';
import { isValidMarket } from '@/lib/market';

export type CatParam = { kind: 'home' } | { kind: 'all' } | { kind: 'none' } | { kind: 'slug'; slug: string };
export type StatusTab = 'all' | 'live' | 'draft';

export interface ViewProduct {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  category_id?: string | null;
  source_product_ref?: string | null;
}
export interface ViewCategory {
  id: string;
  slug: string;
  name_fr: string;
  name_es: string;
  name_uk: string;
  icon: string | null;
  sort_order: number;
}
export interface PresenceRow {
  id: string;
  market: string;
  active: boolean;
  source_product_ref?: string | null;
}
export interface CategoryCount {
  id: string;
  slug: string;
  name: string;
  icon: string;
  total: number;
  live: number;
  draft: number;
}

/** `?cat=` → destination : absent = accueil (cartes), `all`, `none` (sans catégorie) ou un slug. */
export function parseCat(v: string | string[] | undefined): CatParam {
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  if (!s) return { kind: 'home' };
  if (s === 'all') return { kind: 'all' };
  if (s === 'none') return { kind: 'none' };
  return { kind: 'slug', slug: s };
}

export function categoryName(cat: ViewCategory, market: string): string {
  return (market === 'es' ? cat.name_es : market === 'uk' ? cat.name_uk : cat.name_fr) || cat.name_fr;
}

/** Les catégories historiques vides (ex. « gaming » remplacée par « jeux-jouets ») ne s'affichent pas. */
const isLegacyEmpty = (c: ViewCategory, total: number) => total === 0 && /^gaming/.test(c.slug);

/** Une carte par catégorie, dans l'ordre du site, plus les totaux « tous » et « sans catégorie ». */
export function countByCategory(products: ViewProduct[], categories: ViewCategory[], market: string) {
  const cats: CategoryCount[] = [];
  for (const c of categories) {
    const mine = products.filter((p) => p.category_id === c.id);
    if (isLegacyEmpty(c, mine.length)) continue;
    const live = mine.filter((p) => p.active).length;
    cats.push({ id: c.id, slug: c.slug, name: categoryName(c, market), icon: c.icon || '📁', total: mine.length, live, draft: mine.length - live });
  }
  const known = new Set(categories.map((c) => c.id));
  const orphans = products.filter((p) => !p.category_id || !known.has(p.category_id));
  const live = products.filter((p) => p.active).length;
  return {
    categories: cats,
    none: { total: orphans.length, live: orphans.filter((p) => p.active).length, draft: orphans.filter((p) => !p.active).length },
    all: { total: products.length, live, draft: products.length - live },
  };
}

/** Produits d'une destination (catégorie, tous, sans catégorie). */
export function productsFor<T extends ViewProduct>(products: T[], cat: CatParam, categories: ViewCategory[]): T[] {
  if (cat.kind === 'all' || cat.kind === 'home') return products;
  if (cat.kind === 'none') {
    const known = new Set(categories.map((c) => c.id));
    return products.filter((p) => !p.category_id || !known.has(p.category_id));
  }
  const c = categories.find((x) => x.slug === cat.slug);
  return c ? products.filter((p) => p.category_id === c.id) : [];
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Onglet En ligne / Brouillon + recherche (nom ou adresse, sans accents ni casse). */
export function filterList<T extends ViewProduct>(list: T[], status: StatusTab, q: string): T[] {
  const needle = norm(q.trim());
  return list.filter((p) => {
    if (status === 'live' && !p.active) return false;
    if (status === 'draft' && p.active) return false;
    return !needle || norm(p.name).includes(needle) || norm(p.slug).includes(needle);
  });
}

export function statusCounts(list: ViewProduct[]) {
  const live = list.filter((p) => p.active).length;
  return { all: list.length, live, draft: list.length - live };
}

/** Marchés où existe chaque produit (lignes reliées par source_product_ref), dans l'ordre FR, ES, UK. */
export function buildPresence(rows: PresenceRow[]): Record<string, { market: string; active: boolean }[]> {
  const order: Record<string, number> = { fr: 0, es: 1, uk: 2 };
  const out: Record<string, { market: string; active: boolean }[]> = {};
  for (const r of rows) {
    const root = r.source_product_ref || r.id;
    (out[root] ||= []).push({ market: r.market, active: r.active });
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => (order[a.market] ?? 9) - (order[b.market] ?? 9));
  return out;
}

export const presenceOf = (p: Pick<ViewProduct, 'id' | 'source_product_ref'>, map: Record<string, { market: string; active: boolean }[]>) =>
  map[p.source_product_ref || p.id] || [];

// ─────────────────────────────────────────────────────────────────────────────
// Adresses publiques, résumé de synchronisation et allègement des lignes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adresse PUBLIQUE d'une page d'un marché (tendpick.fr / .es / .com).
 * Dans l'admin, un lien relatif « /mon-produit » ne marche pas : le back-office vit sur son propre
 * domaine, qui renvoie tout ce qui n'est pas /admin vers le tableau de bord.
 */
export function publicUrl(market: string | null | undefined, path: string): string {
  const origin = MARKET_ORIGIN[isValidMarket(market) ? market : 'fr'];
  const p = !path || path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `${origin}${p}`;
}

export interface SyncReport {
  activated?: { market: string }[];
  deactivated?: { market: string }[];
  skipped?: { market: string; reasons: string[] }[];
}

/**
 * Résumé lisible du résultat de /api/products/[id] après un changement d'état en ligne / brouillon :
 * les autres marchés du même produit suivent, sauf ceux qui ne sont pas prêts (lien neutre, pas de photo).
 * `blocked` = au moins un marché n'a pas pu suivre : à signaler en avertissement.
 */
export function summarizeSync(sync: SyncReport | null | undefined, nowActive: boolean): { text: string; blocked: boolean } {
  if (!sync) return { text: '', blocked: false };
  const parts: string[] = [];
  const moved = [...(sync.activated ?? []), ...(sync.deactivated ?? [])].map((x) => x.market.toUpperCase());
  if (moved.length) parts.push(`${nowActive ? 'Activé' : 'Désactivé'} aussi sur : ${moved.join(', ')}.`);
  for (const s of sync.skipped ?? []) parts.push(`${s.market.toUpperCase()} resté en brouillon (${s.reasons.join(', ')}).`);
  return { text: parts.join(' '), blocked: (sync.skipped?.length ?? 0) > 0 };
}

/** Champs réellement utilisés par la liste des produits : évite d'envoyer au navigateur les textes IA, FAQ, scripts… */
export interface TableProduct {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  market: string;
  category_id: string | null;
  source_product_ref: string | null;
  price: number | null;
  price_currency: string | null;
  image_url: string | null;
  images: string[];
}

export function toTableProduct(p: {
  id: string; name: string; slug: string; active: boolean; market?: string | null; category_id?: string | null;
  source_product_ref?: string | null; price?: number | null; price_currency?: string | null; image_url?: string | null; images?: string[] | null;
}): TableProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    active: !!p.active,
    market: p.market ?? 'fr',
    category_id: p.category_id ?? null,
    source_product_ref: p.source_product_ref ?? null,
    price: p.price ?? null,
    price_currency: p.price_currency ?? null,
    image_url: p.image_url ?? null,
    images: Array.isArray(p.images) ? p.images.filter((v) => typeof v === 'string' && v.trim() !== '').slice(0, 1) : [],
  };
}
