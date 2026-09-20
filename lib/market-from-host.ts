import type { Market } from '@/lib/market';

/**
 * Détecte le marché VISITEUR depuis le nom d'hôte — logique canonique,
 * reprise à l'identique par middleware.ts (pour le cookie/header
 * informatifs) et par toute page qui a besoin du marché du visiteur dès le
 * premier rendu (pas de produit associé pour donner product.market, pas de
 * cookie encore posé) : app/bio/page.tsx, fallback de app/api/leads/route.ts.
 *
 * Ne JAMAIS dépendre du cookie `opf_market` pour une décision de rendu —
 * un Set-Cookie posé par le middleware n'est pas lisible dans la même
 * requête qui vient de le poser (comportement HTTP standard), donc tout
 * premier visiteur retombait sur la valeur par défaut. Cette fonction lit
 * directement le host, disponible dès la première requête.
 */
export function getMarketFromHost(host: string | null | undefined): Market {
  const h = (host ?? '').split(':')[0].toLowerCase();
  if (h.includes('tendpick.es')) return 'es';
  if (h.includes('tendpick.com') && !h.includes('tendpick.fr')) return 'uk';
  return 'fr';
}
