/**
 * Redirection vers le domaine du marché (audit C3).
 *
 * Une fiche produit ou un article appartient à UN marché (colonne
 * `market`) mais était servi en 200 sur les trois domaines : contenu
 * dupliqué et canonical qui contredit le domaine visité. Sur un domaine
 * Tendpick, si le contenu appartient à un autre marché, on redirige en 308
 * vers son domaine. Hors domaines Tendpick (localhost, back-office,
 * previews), rien ne change.
 */
import { headers } from 'next/headers';
import { permanentRedirect } from 'next/navigation';
import type { Market } from '@/lib/market';
import { getMarketFromHost } from '@/lib/market-from-host';
import { getRequestHost, isTendpickHost, marketUrl } from '@/lib/site-url';

export function redirectToMarketDomain(contentMarket: Market, path: string): void {
  const host = getRequestHost(headers());
  if (!isTendpickHost(host)) return;
  if (getMarketFromHost(host) === contentMarket) return;
  permanentRedirect(marketUrl(contentMarket, path));
}
