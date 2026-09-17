/**
 * Marché actif — France / Espagne / UK (proxy pour tout le contenu
 * anglophone, pas seulement le Royaume-Uni géographique).
 *
 * Point d'entrée unique pour le typage marché dans tout le code — ne pas
 * dupliquer le type littéral 'fr' | 'es' | 'uk' ailleurs.
 */

export type Market = 'fr' | 'es' | 'uk';

export const DEFAULT_MARKET: Market = 'fr';

export const MARKETS: { code: Market; label: string; flag: string; locale: string }[] = [
  { code: 'fr', label: 'France', flag: '🇫🇷', locale: 'fr-FR' },
  { code: 'es', label: 'Espagne', flag: '🇪🇸', locale: 'es-ES' },
  { code: 'uk', label: 'UK / Anglophone', flag: '🇬🇧', locale: 'en-GB' },
];

export function isValidMarket(value: string | null | undefined): value is Market {
  return value === 'fr' || value === 'es' || value === 'uk';
}

export function getMarketLabel(market: Market): string {
  return MARKETS.find((m) => m.code === market)?.label ?? market;
}

/**
 * Devise associée au marché — FR/ES en EUR, UK en GBP.
 * Utilisé par lib/analytics/roi.ts (Sprint 5) pour les calculs coût/gain.
 */
export function getCurrencyForMarket(market: Market): 'EUR' | 'GBP' {
  return market === 'uk' ? 'GBP' : 'EUR';
}
