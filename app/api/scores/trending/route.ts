/**
 * ═══════════════════════════════════════════════════════
 * API #3 — TRENDING SCORE ENGINE
 * Route: POST /api/scores/trending
 * ═══════════════════════════════════════════════════════
 *
 * Calculates a "Trending Score" (0–100) for each product
 * by combining 3 signals:
 *
 *   1. Click Velocity (40%): ratio of 7-day click rate vs 30-day rate
 *      → products gaining momentum score higher than established ones
 *
 *   2. Google Trends (35%): search interest score via SerpApi
 *      → products people are actively searching for
 *
 *   3. BSR Score (25%): inverted Amazon Best Seller Rank
 *      → lower BSR (= better seller) = higher score
 *
 * Formula:
 *   trending_score = (click_velocity * 0.40) + (trends_avg * 0.35) + (bsr_score * 0.25)
 *
 * Updates products.trending_score column (0–100).
 * Called by cron job every day at 06:00.
 *
 * Body (optional):
 * {
 *   "market": "fr",                    // default: "fr" (main market)
 *   "product_ids": [1, 2, 3],          // default: all products
 *   "skip_trends": false               // set true to skip SerpApi call (saves credits)
 * }
 *
 * Auth: Authorization: Bearer ${INTERNAL_API_KEY}
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTrendsInterest, cleanKeyword, type MarketId } from '@/lib/serpapi';
import { requireInternalAuth, logSyncStart, logSyncEnd } from '@/lib/api-auth';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductForScoring {
  id: string;  // UUID (Supabase)
  name: string;
  name_fr: string | null;
  name_en: string | null;
  bsr_fr: number | null;
  bsr_es: number | null;
  bsr_com: number | null;
  clicks_7d: number;
  clicks_30d: number;
}

interface ScoredProduct {
  id: string;  // UUID
  name: string;
  clickVelocityScore: number;
  trendsScore: number;
  bsrScore: number;
  trendingScore: number;
}

// ─── Scoring functions ───────────────────────────────────────────────────────

/**
 * Click velocity score (0–100)
 * If 7-day rate is 2× the 30-day rate → score 100
 * If 7-day rate equals 30-day rate → score 50
 * If no clicks → score 0
 */
function calcClickVelocityScore(clicks7d: number, clicks30d: number): number {
  if (clicks30d === 0 && clicks7d === 0) return 0;
  if (clicks30d === 0) return Math.min(100, clicks7d * 10);

  // Daily rates
  const rate7d = clicks7d / 7;
  const rate30d = clicks30d / 30;

  // Ratio: 2.0 → score 100, 1.0 → score 50, 0 → score 0
  const ratio = rate30d > 0 ? rate7d / rate30d : 0;
  return Math.min(100, Math.round(ratio * 50));
}

/**
 * BSR score (0–100)
 * Uses logarithmic scale to handle wide BSR range
 * BSR 1      → ~100
 * BSR 1,000  → ~60
 * BSR 10,000 → ~40
 * BSR 100,000 → ~20
 * BSR 1,000,000 → ~0
 */
function calcBsrScore(bsr: number | null): number {
  if (!bsr || bsr <= 0) return 0;
  // log10(1) = 0, log10(1M) = 6
  const score = Math.max(0, 100 - Math.log10(bsr) * 16.67);
  return Math.round(score);
}

/**
 * Composite trending score (0–100)
 * Weighted combination of the 3 signals
 */
function calcTrendingScore(
  clickVelocityScore: number,
  trendsScore: number,
  bsrScore: number
): number {
  const score =
    clickVelocityScore * 0.4 +
    trendsScore * 0.35 +
    bsrScore * 0.25;
  return Math.min(100, Math.max(0, Math.round(score)));
}

// ─── Batch Google Trends queries ─────────────────────────────────────────────

/**
 * Query Google Trends for products in batches of 5 (API limit)
 * Returns a map of product name → trends score
 */
async function fetchTrendsScores(
  products: ProductForScoring[],
  marketId: MarketId
): Promise<Map<string, number>> {
  const scoresMap = new Map<string, number>();

  // Prepare keywords: prefer localized name, fallback to generic name
  // cleanKeyword truncates long product names for Google Trends (avoids HTTP 400)
  const productKeywords = products.map((p) => ({
    id: p.id,
    keyword: cleanKeyword(
      (marketId === 'fr' ? p.name_fr : p.name_en) ??
      p.name_fr ??
      p.name ??
      ''
    ),
  }));

  // Process individually (batch=1) to avoid HTTP 400 from multi-term comparison mode
  // and to get absolute interest scores instead of relative comparison scores
  const BATCH = 1;
  for (let i = 0; i < productKeywords.length; i += BATCH) {
    const batch = productKeywords.slice(i, i + BATCH);
    const keywords = batch.map((b) => b.keyword).filter(Boolean);

    if (keywords.length === 0) continue;

    try {
      const results = await getTrendsInterest(keywords, marketId, 'today 3-m');
      const resultsMap = new Map(results.map((r) => [r.keyword.toLowerCase(), r]));

      for (const item of batch) {
        const trends = resultsMap.get(item.keyword.toLowerCase());
        if (trends) {
          // Blend average (0-100) with trend direction boost
          const trendBonus = Math.max(0, trends.trend * 0.2); // rising = bonus points
          const score = Math.min(100, trends.average + trendBonus);
          scoresMap.set(item.id, Math.round(score));
        } else {
          scoresMap.set(item.id, 50); // neutral if not found
        }
      }
    } catch (err) {
      console.warn(`[TrendingScore] Trends batch ${i}-${i + BATCH} failed:`, err);
      // Set neutral score for failed batch
      batch.forEach(({ id }) => scoresMap.set(id, 50));
    }

    // Rate limit: 1 req/sec for SerpApi free tier
    if (i + BATCH < productKeywords.length) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  return scoresMap;
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  const globalStart = Date.now();

  let body: {
    market?: MarketId;
    product_ids?: string[];  // UUIDs
    skip_trends?: boolean;
  } = {};

  try {
    body = await request.json();
  } catch {
    // Use defaults
  }

  const marketId: MarketId = body.market ?? 'fr';
  const skipTrends = body.skip_trends ?? false;
  let logId = 0;
  try {
    logId = await logSyncStart(marketId, 'trending');
  } catch (dbErr) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    console.error('[TrendingScore] DB unavailable:', msg);
    return NextResponse.json({ error: 'Database unavailable', detail: msg }, { status: 503 });
  }

  // ─── Fetch products with click stats ───────────────────────────────────────

  const productFilter =
    body.product_ids?.length ? `AND p.id = ANY($1::uuid[])` : '';
  const params = body.product_ids?.length ? [body.product_ids] : [];

  let products: ProductForScoring[];
  try {
    products = await query<ProductForScoring>(
      `SELECT
         p.id,
         COALESCE(p.name_fr, p.name) AS name,
         p.name_fr,
         p.name_en,
         p.bsr_fr, p.bsr_es, p.bsr_com,
         -- Clicks in the last 7 days
         COUNT(c7.id) FILTER (
           WHERE c7.clicked_at >= NOW() - INTERVAL '7 days'
         )::int AS clicks_7d,
         -- Clicks in the last 30 days
         COUNT(c30.id) FILTER (
           WHERE c30.clicked_at >= NOW() - INTERVAL '30 days'
         )::int AS clicks_30d
       FROM products p
       LEFT JOIN product_clicks c7
         ON c7.product_id = p.id AND c7.market_id = $${params.length + 1}
       LEFT JOIN product_clicks c30
         ON c30.product_id = p.id AND c30.market_id = $${params.length + 1}
       WHERE 1=1 ${productFilter}
       GROUP BY p.id, p.name_fr, p.name_en, p.bsr_fr, p.bsr_es, p.bsr_com
       ORDER BY p.id`,
      [...params, marketId]
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logSyncEnd(logId, 'error', 0, 1, msg);
    return NextResponse.json({ error: `DB error: ${msg}` }, { status: 500 });
  }

  if (products.length === 0) {
    await logSyncEnd(logId, 'success', 0, 0);
    return NextResponse.json({ success: true, productsScored: 0 });
  }

  console.log(`[TrendingScore] Scoring ${products.length} products for market ${marketId}`);

  // ─── Fetch Google Trends scores ───────────────────────────────────────────

  let trendsScores = new Map<string, number>();
  if (!skipTrends) {
    try {
      trendsScores = await fetchTrendsScores(products, marketId);
    } catch (err) {
      console.warn('[TrendingScore] Trends fetch failed, using neutral scores:', err);
      products.forEach((p) => trendsScores.set(p.id, 50));
    }
  } else {
    products.forEach((p) => trendsScores.set(p.id, 50));
  }

  // ─── Calculate and update scores ──────────────────────────────────────────

  const bsrCol = `bsr_${marketId}` as 'bsr_fr' | 'bsr_es' | 'bsr_com';
  const scored: ScoredProduct[] = [];

  for (const product of products) {
    const clickVelocityScore = calcClickVelocityScore(
      product.clicks_7d,
      product.clicks_30d
    );
    const trendsScore = trendsScores.get(product.id) ?? 50;
    const bsrScore = calcBsrScore(product[bsrCol]);
    const trendingScore = calcTrendingScore(
      clickVelocityScore,
      trendsScore,
      bsrScore
    );

    scored.push({
      id: product.id,
      name: product.name,
      clickVelocityScore,
      trendsScore,
      bsrScore,
      trendingScore,
    });
  }

  // Batch update trending_score in the DB
  try {
    // Build a VALUES list for efficient bulk update
    const values = scored
      .map((p, i) => `($${i * 2 + 1}::uuid, $${i * 2 + 2}::float)`)
      .join(', ');
    const flatParams = scored.flatMap((p) => [p.id, p.trendingScore]);

    await query(
      `UPDATE products AS p
       SET trending_score = v.score,
           trending_updated_at = NOW()
       FROM (VALUES ${values}) AS v(id, score)
       WHERE p.id = v.id`,
      flatParams
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logSyncEnd(logId, 'error', 0, 1, msg);
    return NextResponse.json({ error: `Update error: ${msg}` }, { status: 500 });
  }

  // Sort by score for the response
  scored.sort((a, b) => b.trendingScore - a.trendingScore);
  const top10 = scored.slice(0, 10);

  await logSyncEnd(logId, 'success', scored.length, 0);

  return NextResponse.json({
    success: true,
    durationMs: Date.now() - globalStart,
    market: marketId,
    productsScored: scored.length,
    top10: top10.map((p) => ({
      id: p.id,
      name: p.name,
      trendingScore: p.trendingScore,
      breakdown: {
        clickVelocity: `${p.clickVelocityScore} × 40%`,
        googleTrends: `${p.trendsScore} × 35%`,
        bsrScore: `${p.bsrScore} × 25%`,
      },
    })),
  });
}

/** GET — return current top trending products */
export async function GET(request: NextRequest) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const market = (searchParams.get('market') ?? 'fr') as MarketId;
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10));

  const products = await query<{
    id: string;  // UUID
    name: string;
    trending_score: number;
    trending_updated_at: string;
    clicks_7d: number;
  }>(
    `SELECT
       p.id,
       COALESCE(p.name_fr, p.name) AS name,
       p.trending_score,
       p.trending_updated_at,
       COUNT(c.id) FILTER (WHERE c.clicked_at >= NOW() - INTERVAL '7 days')::int AS clicks_7d
     FROM products p
     LEFT JOIN product_clicks c ON c.product_id = p.id AND c.market_id = $1
     WHERE p.trending_score > 0
     GROUP BY p.id, p.name_fr, p.trending_score, p.trending_updated_at
     ORDER BY p.trending_score DESC
     LIMIT $2`,
    [market, limit]
  );

  return NextResponse.json({ market, products });
}
