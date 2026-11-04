import { SHOW_PRICES, SHOW_MERCHANT_PRICES } from '@/lib/flags';
import { getCurrencyForMarket } from '@/lib/market';
import type { Market } from '@/lib/market';
import type { Product } from '@/types';

type PriceFields = Pick<Product, 'price' | 'price_currency' | 'price_checked_at' | 'affiliate_url'>;

/**
 * Prix « publiable » d'un produit, ou null. UNE seule règle pour tout ce qui
 * affiche ou déclare un prix (fiche, vignettes, données structurées Google) :
 * ce qui est dit à Google doit être exactement ce que le visiteur voit.
 *
 * Règles :
 *  - un prix sans date de relevé valide n'est JAMAIS publié (ni affiché, ni
 *    déclaré) : un prix non daté est trompeur et contraire aux règles
 *    Amazon Associates ;
 *  - prix Amazon : seulement si SHOW_PRICES (désactivé, décision du 18/10) ;
 *  - autres marchands (AliExpress…) : si SHOW_MERCHANT_PRICES, avec
 *    astérisque + mention « prix à confirmer » (décision du 01/11) ;
 *  - un prix nul, négatif ou non numérique est ignoré.
 */
export interface PublishablePrice {
  amount: number;
  currency: string;
  checkedAt: Date;
  /** true => astérisque et mention encadrée « prix à confirmer » obligatoires. */
  merchantPrice: boolean;
}

export function getPublishablePrice(product: PriceFields, market: Market): PublishablePrice | null {
  const amount = typeof product.price === 'string' ? Number(product.price) : product.price;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return null;
  if (!product.price_checked_at) return null;
  const checkedAt = new Date(product.price_checked_at);
  if (Number.isNaN(checkedAt.getTime())) return null;
  const isAmazon = /amazon\.|amzn\./i.test(product.affiliate_url || '');
  const allowed = isAmazon ? SHOW_PRICES : SHOW_PRICES || SHOW_MERCHANT_PRICES;
  if (!allowed) return null;
  return {
    amount,
    currency: product.price_currency || getCurrencyForMarket(market),
    checkedAt,
    // Tout prix publié est un relevé daté chez le marchand : astérisque et mention obligatoires.
    merchantPrice: true,
  };
}

/**
 * Prix à afficher pour un produit, ou null. `merchantPrice` = true => la
 * mention encadrée « prix à confirmer avec le revendeur » est obligatoire.
 */
export function getDisplayPrice(
  product: PriceFields,
  locale: string,
  market: Market,
): { label: string; checkedAt: string | null; merchantPrice: boolean } | null {
  const p = getPublishablePrice(product, market);
  if (!p) return null;
  let label: string;
  let checkedAt: string;
  try {
    label = new Intl.NumberFormat(locale, { style: 'currency', currency: p.currency }).format(p.amount);
    checkedAt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(p.checkedAt);
  } catch {
    // Devise ou langue inconnue : mieux vaut ne pas afficher de prix qu'un prix faux ou une page en erreur.
    return null;
  }
  return { label: p.merchantPrice ? `${label}*` : label, checkedAt, merchantPrice: p.merchantPrice };
}

/**
 * Prix pour une vignette (accueil, catégories, listes) : mêmes règles que
 * getDisplayPrice mais SANS astérisque — le client voit la date et la mention
 * « prix à confirmer » en ouvrant la fiche produit (décision du 03/11/2026).
 */
export function getCardPrice(
  product: PriceFields,
  locale: string,
  market: Market,
): string | null {
  const d = getDisplayPrice(product, locale, market);
  return d ? d.label.replace(/\*$/, '') : null;
}

/**
 * Offre pour les données structurées (JSON-LD) : le prix et la devise EXACTS
 * de la fiche, ou null quand la fiche n'affiche aucun prix. Jamais de prix
 * déclaré à Google qui ne soit pas visible sur la page.
 */
export function getStructuredOffer(
  product: PriceFields,
  locale: string,
  market: Market,
): { price: number; priceCurrency: string } | null {
  if (!getDisplayPrice(product, locale, market)) return null;
  const p = getPublishablePrice(product, market);
  return p ? { price: p.amount, priceCurrency: p.currency } : null;
}
