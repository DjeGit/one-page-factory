/**
 * URL publique de chaque marché — audit SEO du 07/10 (C1).
 *
 * Avant ce fichier, canonical, Open Graph, JSON-LD et metadataBase lisaient
 * tous NEXT_PUBLIC_SITE_URL (une seule valeur pour trois domaines) : une
 * fiche vue sur tendpick.fr déclarait donc un canonical vers tendpick.com,
 * ce qui demandait à Google de désindexer la version française. L'URL de
 * référence est maintenant dérivée du MARCHÉ (de la page ou du visiteur),
 * jamais d'une variable d'environnement unique.
 *
 * Fichier volontairement sans dépendance serveur (pas de next/headers) pour
 * rester testable ; les helpers qui lisent les en-têtes prennent un objet
 * `{ get(name) }` en paramètre.
 */
import type { Market } from '@/lib/market';
import { getMarketFromHost } from '@/lib/market-from-host';

export const MARKET_ORIGIN: Record<Market, string> = {
  fr: 'https://tendpick.fr',
  es: 'https://tendpick.es',
  uk: 'https://tendpick.com',
};

/** Codes hreflang : 'uk' désigne la cible anglophone (pas le Royaume-Uni). */
export const MARKET_HREFLANG: Record<Market, string> = {
  fr: 'fr',
  es: 'es',
  uk: 'en',
};

/** Domaine de repli hreflang x-default : la vitrine internationale. */
export const X_DEFAULT_ORIGIN = MARKET_ORIGIN.uk;

type HeaderReader = { get(name: string): string | null };

/**
 * Hôte de la requête, sans port. Préfère x-forwarded-host (posé par le
 * reverse proxy) puis Host — audit M6 : derrière nginx, Host peut valoir
 * l'adresse interne selon la configuration.
 */
export function getRequestHost(h: HeaderReader): string {
  const forwarded = h.get('x-forwarded-host');
  const raw = (forwarded ? forwarded.split(',')[0] : h.get('host')) ?? '';
  return raw.trim().toLowerCase().split(':')[0];
}

/** Vrai pour tendpick.fr / .es / .com et leurs variantes www. */
export function isTendpickHost(host: string): boolean {
  return /(^|\.)tendpick\.(fr|es|com)$/.test(host);
}

/** Domaine de back-office (jamais indexable). */
export function isBackofficeHost(host: string): boolean {
  return host.includes('one-page-factory.com');
}

/** Marché du visiteur d'après les en-têtes de la requête. */
export function getRequestMarket(h: HeaderReader): Market {
  return getMarketFromHost(getRequestHost(h));
}

/**
 * Origine à utiliser pour les URL absolues de la requête courante. Sur un
 * domaine Tendpick : l'origine canonique du marché (https, sans www). Ailleurs
 * (localhost, domaine de test) : NEXT_PUBLIC_SITE_URL ou localhost, pour que
 * le développement local continue de fonctionner.
 */
export function getRequestOrigin(h: HeaderReader): string {
  const host = getRequestHost(h);
  if (isTendpickHost(host)) return MARKET_ORIGIN[getMarketFromHost(host)];
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function normalizePath(path: string): string {
  if (!path || path === '/') return '';
  return path.startsWith('/') ? path : `/${path}`;
}

/** URL absolue d'une page d'un marché donné. */
export function marketUrl(market: Market, path: string): string {
  return `${MARKET_ORIGIN[market]}${normalizePath(path)}`;
}

/**
 * Bloc `alternates` pour une page ÉQUIVALENTE sur les trois marchés
 * (accueil, catalogue, top ventes, blog, catégories) : canonical vers le
 * domaine courant + hreflang vers chaque version + x-default.
 *
 * À ne PAS utiliser pour une fiche produit ou un article : leur contenu est
 * propre à un marché (voir ProductPage), un hreflang vers une page qui
 * n'existe pas sur l'autre domaine serait faux.
 */
export function buildAlternates(h: HeaderReader, path: string) {
  const host = getRequestHost(h);
  const p = normalizePath(path);
  if (!isTendpickHost(host)) {
    return { canonical: `${getRequestOrigin(h)}${p || '/'}` };
  }
  const market = getMarketFromHost(host);
  return {
    canonical: `${MARKET_ORIGIN[market]}${p || '/'}`,
    languages: {
      [MARKET_HREFLANG.fr]: `${MARKET_ORIGIN.fr}${p || '/'}`,
      [MARKET_HREFLANG.es]: `${MARKET_ORIGIN.es}${p || '/'}`,
      [MARKET_HREFLANG.uk]: `${MARKET_ORIGIN.uk}${p || '/'}`,
      'x-default': `${X_DEFAULT_ORIGIN}${p || '/'}`,
    },
  };
}

/**
 * Vrai si la page est une variante filtrée (?q=, ?tag=, ?category=,
 * ?source=...) : à passer en noindex pour ne pas indexer des milliers de
 * combinaisons (audit E1). `searchParams` d'une page Next.
 */
export function hasIndexBlockingParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  keys: string[]
): boolean {
  if (!searchParams) return false;
  return keys.some((k) => {
    const v = searchParams[k];
    return Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim());
  });
}
