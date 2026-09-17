/**
 * Marché actif — France / Espagne / UK (proxy pour tout le contenu
 * anglophone, pas seulement le Royaume-Uni géographique — décision Jerome).
 *
 * Point d'entrée unique pour le typage marché dans tout le code — ne pas
 * dupliquer le type littéral 'fr' | 'es' | 'uk' ailleurs.
 */

export type Market = 'fr' | 'es' | 'uk';

export const DEFAULT_MARKET: Market = 'fr';

export const MARKETS: {
  code: Market;
  label: string;
  flag: string;
  locale: string;
  /** Marketplace Amazon associée (affichage + génération de liens). */
  amazon: string;
}[] = [
  { code: 'fr', label: 'France', flag: '🇫🇷', locale: 'fr-FR', amazon: 'amazon.fr' },
  { code: 'es', label: 'Espagne', flag: '🇪🇸', locale: 'es-ES', amazon: 'amazon.es' },
  { code: 'uk', label: 'Anglophone', flag: '🇬🇧', locale: 'en-GB', amazon: 'amazon.com' },
];

export function isValidMarket(value: string | null | undefined): value is Market {
  return value === 'fr' || value === 'es' || value === 'uk';
}

export function getMarketLabel(market: Market): string {
  return MARKETS.find((m) => m.code === market)?.label ?? market;
}

/**
 * Devise associée au marché. Les 3 marchés restent en EUR pour l'instant
 * (décision Jerome, 18/09) — "uk" désigne la cible LANGUE anglaise, pas un
 * pays/devise en particulier, et peut couvrir plusieurs pays. La conversion
 * multi-devise réelle (GBP/USD selon pays) est reportée à plus tard.
 */
export function getCurrencyForMarket(_market: Market): 'EUR' {
  return 'EUR';
}
