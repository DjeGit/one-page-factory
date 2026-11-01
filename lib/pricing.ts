import { SHOW_PRICES, SHOW_MERCHANT_PRICES } from '@/lib/flags';
import { getCurrencyForMarket } from '@/lib/market';
import type { Market } from '@/lib/market';
import type { Product } from '@/types';

/**
 * Prix à afficher pour un produit, ou null.
 * - SHOW_PRICES (global) : comportement historique, sans mention de date.
 * - SHOW_MERCHANT_PRICES : prix relevé chez le marchand, affiché seulement avec
 *   sa date de relevé ; jamais pour Amazon (règles Associates).
 * `merchantPrice` = true => l'astérisque et la mention encadrée sont obligatoires.
 */
export function getDisplayPrice(
  product: Pick<Product, 'price' | 'price_currency' | 'price_checked_at' | 'affiliate_url'>,
  locale: string,
  market: Market,
): { label: string; checkedAt: string | null; merchantPrice: boolean } | null {
  if (!product.price) return null;
  const isAmazon = /amazon\.|amzn\./i.test(product.affiliate_url || '');
  const merchantPrice = SHOW_MERCHANT_PRICES && !isAmazon && !!product.price_checked_at;
  if (!SHOW_PRICES && !merchantPrice) return null;
  const currency = product.price_currency || getCurrencyForMarket(market);
  const label = new Intl.NumberFormat(locale, { style: 'currency', currency }).format(product.price);
  const checkedAt = product.price_checked_at
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(product.price_checked_at),
      )
    : null;
  return { label: merchantPrice ? `${label}*` : label, checkedAt, merchantPrice };
}
