/**
 * Validation des paramètres des routes internes « Keepa / Postgres » (sync/prices, sync/availability,
 * scores/trending), appelées par cron (n8n). Ces routes utilisent l'ancien identifiant de marché 'com'
 * (Amazon US) à côté de 'fr' et 'es' : il est conservé ici, c'est un autre périmètre que le marché
 * Tendpick 'uk' (voir lib/keepa.ts).
 */
import { isUuid, readOptionalJsonObject, badRequest, type JsonBody } from './http';
import type { NextResponse } from 'next/server';

export type LegacyMarketId = 'fr' | 'es' | 'com';
export const LEGACY_MARKETS: LegacyMarketId[] = ['fr', 'es', 'com'];

const MAX_PRODUCT_IDS = 2000;

export function isLegacyMarket(v: unknown): v is LegacyMarketId {
  return typeof v === 'string' && (LEGACY_MARKETS as string[]).includes(v);
}

/** Corps JSON optionnel (absent = valeurs par défaut) ; illisible = 400. */
export async function readSyncBody(req: Request): Promise<{ body: JsonBody } | { response: NextResponse }> {
  return readOptionalJsonObject(req);
}

/** Liste de marchés (défaut : tous). */
export function parseLegacyMarkets(value: unknown): { markets: LegacyMarketId[] } | { response: NextResponse } {
  if (value === undefined || value === null) return { markets: [...LEGACY_MARKETS] };
  if (!Array.isArray(value) || value.length === 0 || value.length > LEGACY_MARKETS.length || !value.every(isLegacyMarket)) {
    return { response: badRequest('markets invalide : liste de fr, es, com') };
  }
  return { markets: Array.from(new Set(value)) };
}

/** Liste d'UUID produits (défaut : aucune restriction = tous les produits). */
export function parseProductIds(value: unknown): { ids: string[] } | { response: NextResponse } {
  if (value === undefined || value === null) return { ids: [] };
  if (!Array.isArray(value) || value.length > MAX_PRODUCT_IDS || !value.every((v) => typeof v === 'string' && isUuid(v))) {
    return { response: badRequest(`product_ids invalide : liste de ${MAX_PRODUCT_IDS} identifiants (UUID) au plus`) };
  }
  return { ids: Array.from(new Set(value as string[])) };
}

/** Message d'erreur technique raccourci pour les journaux de synchronisation renvoyés à l'automate. */
export function shortError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.slice(0, 300);
}
