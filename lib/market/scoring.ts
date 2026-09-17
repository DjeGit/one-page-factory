/**
 * Scoring produit pour l'étude de marché (Sprint 4) — reprend et enrichit
 * la logique qui existait en dur dans app/api/pipeline/discover/route.ts
 * (rang/BSR, note, avis, prix, image), sortie ici pour être partagée par
 * app/api/market/refresh et app/api/pipeline/discover, et appliquée à un
 * RawProductSignal générique (n'importe quelle source du registre
 * lib/integrations/), pas seulement au scraping Amazon.
 *
 * Facteurs ajoutés par rapport à l'ancien code, comme recommandé par
 * l'audit :
 *   - commission affiliée réelle, quand la source la fournit (AWIN,
 *     Rakuten, CJ...) — les sources qui ne la fournissent pas (scraping,
 *     Amazon Creators sans taux exposé) laissent ce facteur à 0.
 *   - cohérence de niche : approximée par le nombre de produits déjà
 *     actifs sur CE marché (proxy grossier — le schéma products n'a pas
 *     de colonne "catégorie" à ce jour, donc pas de vraie dispersion
 *     catégorielle possible sans migration supplémentaire).
 *
 * Non implémenté (placeholder documenté, pas de fausse donnée) :
 *   - proxy de viralité réseaux sociaux — aucune source du registre ne
 *     renvoie de signal social aujourd'hui (TikTok Content Posting API
 *     est un canal de publication, pas une source de tendances). À
 *     brancher si une source de type "TikTok Creative Center" rejoint un
 *     jour le registre.
 */
import type { RawProductSignal } from '@/lib/integrations/types';

export interface ScoringContext {
  /** Nombre de produits déjà actifs sur ce marché — proxy de maturité/niche. */
  existingCategoryCount?: number;
}

export interface ScoreResult {
  score: number; // 0-100
  breakdown: Record<string, number>;
}

export function scoreSignal(signal: RawProductSignal, context: ScoringContext = {}): ScoreResult {
  const breakdown: Record<string, number> = {};

  // Rang / BSR (0-25) — plus le rang est petit, meilleur c'est.
  if (signal.bsr != null) {
    if (signal.bsr <= 5) breakdown.rank = 25;
    else if (signal.bsr <= 10) breakdown.rank = 18;
    else if (signal.bsr <= 20) breakdown.rank = 10;
    else breakdown.rank = 3;
  } else {
    breakdown.rank = 0;
  }

  // Note (0-20)
  if (signal.rating != null && signal.rating >= 4.5) breakdown.rating = 20;
  else if (signal.rating != null && signal.rating >= 4.0) breakdown.rating = 12;
  else if (signal.rating != null && signal.rating >= 3.5) breakdown.rating = 5;
  else breakdown.rating = 0;

  // Nombre d'avis (0-15)
  const reviews = signal.reviewCount ?? 0;
  if (reviews >= 1000) breakdown.reviews = 15;
  else if (reviews >= 100) breakdown.reviews = 8;
  else if (reviews >= 20) breakdown.reviews = 3;
  else breakdown.reviews = 0;

  // Prix "sweet spot" (0-10) — zone de prix la plus facile à convertir en affiliation.
  const price = signal.price ?? null;
  if (price != null && price >= 10 && price <= 80) breakdown.price = 10;
  else if (price != null && price > 80 && price <= 150) breakdown.price = 6;
  else breakdown.price = 0;

  // Image présente (0-5)
  breakdown.image = signal.image ? 5 : 0;

  // Commission affiliée réelle (0-15) — seulement si la source la fournit.
  if (signal.commissionRate != null && signal.commissionRate > 0) {
    breakdown.commission = Math.min(15, Math.round(signal.commissionRate * 100));
  } else {
    breakdown.commission = 0;
  }

  // Cohérence de niche (0-10) — proxy grossier basé sur la maturité du marché actif,
  // pas encore une vraie dispersion catégorielle (voir commentaire de tête de fichier).
  const existingCount = context.existingCategoryCount ?? 0;
  if (existingCount >= 1 && existingCount <= 8) breakdown.niche = 10;
  else if (existingCount > 8) breakdown.niche = 4;
  else breakdown.niche = 0;

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { score: Math.min(100, score), breakdown };
}

/** Convertit un score 0-100 en trend_score 0-10 pour la colonne market_products.trend_score. */
export function trendScoreFromScore(score: number): number {
  // market_products.trend_score a un CHECK BETWEEN 1 AND 10 — jamais 0.
  return Math.min(10, Math.max(1, Math.round(score / 10)));
}

/**
 * Fiabilité des données elles-mêmes (0-10), indépendante du score produit —
 * reflète combien de champs la source a réellement renseignés.
 */
export function confidenceScoreFromSignal(signal: RawProductSignal): number {
  let confidence = 3;
  if (signal.rating != null) confidence += 2;
  if ((signal.reviewCount ?? 0) >= 50) confidence += 2;
  if (signal.bsr != null) confidence += 2;
  if (signal.commissionRate != null) confidence += 1;
  return Math.min(10, confidence);
}
