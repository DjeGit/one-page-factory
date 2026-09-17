/**
 * OPF — Multi-market configuration (source of truth)
 * Maps domains → market IDs for routing & analytics
 */

export type MarketId = 'fr' | 'es' | 'com';

export interface Market {
  id: MarketId;
  domain: string;
  locale: string;
  currency: 'EUR' | 'USD';
  currencySymbol: string;
  amazonTag: string | null;
  amazonDomain: string;
  flag: string;
  label: string;
  isDefault: boolean;
}

export const MARKETS: Record<MarketId, Market> = {
  fr: {
    id: 'fr',
    domain: 'tendpick.fr',
    locale: 'fr-FR',
    currency: 'EUR',
    currencySymbol: '€',
    amazonTag: 'tendpick-21',
    amazonDomain: 'www.amazon.fr',
    flag: '🇫🇷',
    label: 'France',
    isDefault: true,
  },
  es: {
    id: 'es',
    domain: 'tendpick.es',
    locale: 'es-ES',
    currency: 'EUR',
    currencySymbol: '€',
    amazonTag: null,
    amazonDomain: 'www.amazon.es',
    flag: '🇪🇸',
    label: 'España',
    isDefault: false,
  },
  com: {
    id: 'com',
    domain: 'tendpick.com',
    locale: 'en-US',
    currency: 'USD',
    currencySymbol: '$',
    amazonTag: null,
    amazonDomain: 'www.amazon.com',
    flag: '🌍',
    label: 'International',
    isDefault: false,
  },
};

export const ACTIVE_MARKETS = Object.values(MARKETS).filter((m) => true);
export const DEFAULT_MARKET: Market = MARKETS.fr;

/**
 * Returns the market ID matching the request hostname.
 * Falls back to 'fr' (default) if no match found.
 */
export function getMarketFromHost(host: string): MarketId {
  const h = host.split(':')[0].toLowerCase(); // strip port
  if (h.includes('tendpick.es') || h.endsWith('.es')) return 'es';
  if (h.includes('tendpick.com') || h.endsWith('.com')) return 'com';
  return 'fr'; // default
}

/**
 * Build an Amazon affiliate URL for a product ASIN on a given market
 */
export function buildAmazonUrl(asin: string, market: MarketId): string {
  const m = MARKETS[market];
  const tag = m.amazonTag ? `?tag=${m.amazonTag}` : '';
  return `https://${m.amazonDomain}/dp/${asin}${tag}`;
}
