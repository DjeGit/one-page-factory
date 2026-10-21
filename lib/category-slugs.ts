import type { Market } from '@/lib/market';
import { MARKET_HREFLANG, MARKET_ORIGIN, X_DEFAULT_ORIGIN } from '@/lib/site-url';

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
  'best-of-amazon': { fr: 'best-of-amazon', es: 'lo-mejor-de-amazon', uk: 'best-of-amazon' },
  tech: { fr: 'tech-gadgets', es: 'tecnologia', uk: 'tech-gadgets' },
  'mode-beaute': { fr: 'mode-beaute', es: 'moda-belleza', uk: 'fashion-beauty' },
  'maison-deco': { fr: 'maison-deco', es: 'hogar-decoracion', uk: 'home-living' },
  'sport-bien-etre': { fr: 'sport-bien-etre', es: 'deporte-bienestar', uk: 'sport-wellness' },
  gaming: { fr: 'gaming-casino-paris', es: 'gaming-casino-apuestas', uk: 'gaming-casino-betting' },
  'art-design': { fr: 'art-design', es: 'arte-diseno', uk: 'art-design' },
  loisirs: { fr: 'loisirs-divertissement', es: 'ocio-entretenimiento', uk: 'hobbies-leisure' },
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
  for (const [base, byMarket] of Object.entries(LOCALIZED)) {
    if (base === urlSlug || MARKETS.some((m) => byMarket[m] === urlSlug)) return base;
  }
  return urlSlug;
}

/** Canonical + hreflang d'une catégorie : chaque langue pointe vers SON URL. */
export function categoryAlternates(baseSlug: string, market: Market) {
  const url = (m: Market) => `${MARKET_ORIGIN[m]}${categoryPath(baseSlug, m)}`;
  return {
    canonical: url(market),
    languages: {
      [MARKET_HREFLANG.fr]: url('fr'),
      [MARKET_HREFLANG.es]: url('es'),
      [MARKET_HREFLANG.uk]: url('uk'),
      'x-default': `${X_DEFAULT_ORIGIN}${categoryPath(baseSlug, 'uk')}`,
    },
  };
}
