/**
 * A/B testing : lecture statistique d'un test (fonctions pures).
 *
 * Avant : « gagnant » = écart de CTR d'au moins 20 points ET « significatif » = 15 points.
 * Avec des taux de clic réels de 1 à 10 %, ces seuils n'étaient jamais atteints : aucun
 * gagnant n'était jamais signalé. On utilise maintenant un test de Student sur deux
 * proportions (z-test), seuil de confiance 95 %, avec un minimum de vues par variante.
 */
export const MIN_VIEWS_PER_VARIANT = 100;

export interface VariantCounts {
  views: number;
  clicks: number;
}

export interface ABReading {
  ctrA: number; // en %
  ctrB: number; // en %
  /** Variante en tête (même sans signification). null si égalité ou pas de données. */
  leader: 'a' | 'b' | null;
  /** Confiance (0-100) que l'écart n'est pas dû au hasard. */
  confidence: number;
  enoughData: boolean;
  /** Vrai si l'écart est significatif à 95 %. */
  significant: boolean;
}

/** Fonction de répartition de la loi normale centrée réduite (approximation d'Abramowitz-Stegun). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function readABTest(a: VariantCounts, b: VariantCounts): ABReading {
  const va = Math.max(0, a.views || 0);
  const vb = Math.max(0, b.views || 0);
  const ca = Math.min(Math.max(0, a.clicks || 0), va);
  const cb = Math.min(Math.max(0, b.clicks || 0), vb);
  const ctrA = va > 0 ? (ca / va) * 100 : 0;
  const ctrB = vb > 0 ? (cb / vb) * 100 : 0;
  const enoughData = va >= MIN_VIEWS_PER_VARIANT && vb >= MIN_VIEWS_PER_VARIANT;
  const leader = ctrA === ctrB ? null : ctrA > ctrB ? 'a' : 'b';

  let confidence = 0;
  if (va > 0 && vb > 0) {
    const pooled = (ca + cb) / (va + vb);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / va + 1 / vb));
    if (se > 0) {
      const z = Math.abs(ca / va - cb / vb) / se;
      confidence = Math.round((2 * normalCdf(z) - 1) * 1000) / 10;
    }
  }
  return { ctrA, ctrB, leader, confidence, enoughData, significant: enoughData && confidence >= 95 };
}
