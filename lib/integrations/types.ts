import type { Market } from '@/lib/market';

/**
 * Signal produit brut renvoyé par n'importe quelle source de données
 * marché, avant scoring (lib/market/scoring.ts, Sprint 4). Toutes les
 * sources (Keepa, DataForSEO, AWIN, scraping...) convergent vers cette
 * forme commune — le scoring ne connaît jamais le format natif d'une API
 * spécifique.
 */
export interface RawProductSignal {
  source: string; // id d'intégration d'origine, ex. 'keepa'
  market: Market;
  name: string;
  category?: string;
  description?: string;
  price?: number | null;
  currency?: string;
  rating?: number | null;
  reviewCount?: number;
  bsr?: number | null; // Best Seller Rank, si dispo
  image?: string;
  url: string; // lien produit / affilié source
  commissionRate?: number | null; // taux de commission réel si connu (0-1)
  raw?: unknown; // payload natif conservé pour debug
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
}

/**
 * Interface commune à toute source de données d'étude de marché.
 * Pattern calqué sur lib/ai.ts (détection par variable d'env, client
 * lazy) — mais utilisé en AGRÉGATION multi-source par
 * lib/integrations/data-source-chain.ts, pas en fallback strict : on
 * cumule les signaux de toutes les sources activées plutôt que de
 * basculer seulement en cas de panne.
 */
export interface DataSourceClient {
  id: string;
  displayName: string;
  /** Vrai si la/les variable(s) d'env requise(s) sont présentes. */
  isConfigured(): boolean;
  fetchTrendingProducts(market: Market, category?: string): Promise<RawProductSignal[]>;
  testConnection(): Promise<ConnectionTestResult>;
}

/** Contenu prêt à publier sur un canal social, pour un marché donné. */
export interface SocialPostContent {
  market: Market;
  text: string;
  imageUrls?: string[];
  videoUrl?: string;
  link?: string;
}

export interface SocialChannelClient {
  id: string;
  displayName: string;
  isConfigured(): boolean;
  publish(content: SocialPostContent): Promise<{ ok: boolean; postId?: string; message: string }>;
  testConnection(): Promise<ConnectionTestResult>;
}
