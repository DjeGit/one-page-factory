import type { Market } from '@/lib/market';
import { MARKET_HREFLANG, MARKET_ORIGIN } from '@/lib/site-url';

/**
 * Slugs d'URL de catégories traduits par marché (/c/<slug>).
 *
 * La clé reste le slug stocké en base (categories.slug) : il sert de
 * référence interne et ne change jamais. Seule l'URL publique est traduite,
 * pour que chaque domaine expose des adresses dans sa langue
 * (tendpick.es/c/hogar-decoracion, tendpick.com/c/home-living…).
 *
 * Une catégorie absente de cette table (créée plus tard dans l'admin)
 * garde son slug de base sur les trois marchés.
 *
 * Les anciennes URL (slug de base, ou slug d'un autre marché) répondent par
 * une redirection 301 vers l'URL du marché courant : voir
 * app/c/[slug]/page.tsx.
 */
const LOCALIZED: Record<string, Record<Market, string>> = {
  tech: { fr: 'tech-gadgets', es: 'tecnologia', uk: 'tech-gadgets' },
  'mode-beaute': { fr: 'mode-beaute', es: 'moda-belleza', uk: 'fashion-beauty' },
  'maison-deco': { fr: 'maison-deco', es: 'hogar-decoracion', uk: 'home-living' },
  'sport-bien-etre': { fr: 'sport-bien-etre', es: 'deporte-bienestar', uk: 'sport-wellness' },
  'jeux-jouets': { fr: 'jeux-jouets', es: 'juguetes-juegos', uk: 'toys-games' },
  'art-design': { fr: 'art-design', es: 'arte-diseno', uk: 'art-design' },
  loisirs: { fr: 'loisirs-divertissement', es: 'ocio-entretenimiento', uk: 'hobbies-leisure' },
  puericulture: { fr: 'bebe-puericulture', es: 'bebe-puericultura', uk: 'baby-nursery' },
};

/**
 * Anciens slugs devenus obsolètes (catégorie « Gaming, Casino & Paris »
 * remplacée par « Jeux & Jouets », 28/10/2026). Ils répondent par une
 * redirection 301 vers la nouvelle catégorie.
 */
const LEGACY_SLUGS: Record<string, string> = {
  gaming: 'jeux-jouets',
  'gaming-casino-paris': 'jeux-jouets',
  'gaming-casino-apuestas': 'jeux-jouets',
  'gaming-casino-betting': 'jeux-jouets',
};

const MARKETS: Market[] = ['fr', 'es', 'uk'];

/** Slug d'URL d'une catégorie pour un marché (repli : slug de base). */
export function localizedCategorySlug(baseSlug: string, market: Market): string {
  return LOCALIZED[baseSlug]?.[market] ?? baseSlug;
}

/** Chemin public d'une catégorie sur un marché : /c/<slug traduit>. */
export function categoryPath(baseSlug: string, market: Market): string {
  return `/c/${localizedCategorySlug(baseSlug, market)}`;
}

/**
 * Retrouve le slug de base d'après un slug d'URL (de n'importe quel marché).
 * Si rien ne correspond, renvoie le slug tel quel (catégorie hors table).
 */
export function baseCategorySlug(urlSlug: string): string {
  if (LEGACY_SLUGS[urlSlug]) return LEGACY_SLUGS[urlSlug];
  for (const [base, byMarket] of Object.entries(LOCALIZED)) {
    if (base === urlSlug || MARKETS.some((m) => byMarket[m] === urlSlug)) return base;
  }
  return urlSlug;
}

/**
 * Canonical + hreflang d'une catégorie : chaque langue pointe vers SON URL.
 *
 * `availableMarkets` = marchés où la catégorie a au moins un produit en ligne
 * (donc où la page existe vraiment : /c/<slug> répond 404 sur les autres).
 * Un hreflang vers une page qui n'existe pas est une erreur pour Google ; on
 * ne déclare donc que les versions qui répondent 200. Sans cette liste
 * (anciens appels), les trois versions sont déclarées. La page courante est
 * toujours déclarée (hreflang auto-référent).
 */
export function categoryAlternates(baseSlug: string, market: Market, availableMarkets?: Market[]) {
  const url = (m: Market) => `${MARKET_ORIGIN[m]}${categoryPath(baseSlug, m)}`;
  const present = new Set<Market>(availableMarkets ?? MARKETS);
  present.add(market);
  const languages: Record<string, string> = {};
  for (const m of MARKETS) {
    if (present.has(m)) languages[MARKET_HREFLANG[m]] = url(m);
  }
  const defaultMarket: Market = present.has('uk') ? 'uk' : MARKETS.find((m) => present.has(m)) ?? market;
  languages['x-default'] = `${MARKET_ORIGIN[defaultMarket]}${categoryPath(baseSlug, defaultMarket)}`;
  return { canonical: url(market), languages };
}
