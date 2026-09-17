/**
 * Marché actif de la session admin — lu depuis le cookie 'active_market'.
 *
 * IMPORTANT : ce helper est réservé aux pages/routes de l'admin
 * (app/admin/**, app/api/{products,analytics,market,leads,ab-test,
 * top-products,weekly-report}/**). Les routes PUBLIQUES (pages produits
 * Tendpick, /api/go/[code]) ne doivent JAMAIS l'utiliser : leur marché est
 * déterminé par le produit lui-même (products.market), pas par une
 * préférence d'admin — sinon fuite de logique admin dans le tracking
 * public.
 *
 * Pattern calqué sur getSupabaseAdmin() (lib/supabase.ts) : un seul point
 * de vérité réutilisé partout plutôt qu'une relecture de cookie dupliquée
 * dans chaque route.
 */
import { cookies } from 'next/headers';
import { DEFAULT_MARKET, isValidMarket, type Market } from '@/lib/market';

export const ACTIVE_MARKET_COOKIE = 'active_market';

export function getActiveMarket(): Market {
  const value = cookies().get(ACTIVE_MARKET_COOKIE)?.value;
  return isValidMarket(value) ? value : DEFAULT_MARKET;
}
