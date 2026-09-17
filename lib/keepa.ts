/**
 * Keepa API Client
 * Docs  : https://keepa.com/#!api
 * Pricing: from €49/month (1 token/sec refill)
 *
 * Domain codes used by Keepa:
 *   1 = amazon.com (COM)
 *   4 = amazon.fr  (FR)
 *   9 = amazon.es  (ES)
 *
 * Price encoding: integer / 100 = actual price
 *   -1 means "not available / no offer"
 *
 * CSV price array indices (stats.current[]):
 *   0 = Amazon price
 *   1 = Marketplace New (lowest new offer)
 *   3 = Sales Rank (BSR)
 */

export type MarketId = 'fr' | 'es' | 'com';

export const KEEPA_DOMAIN: Record<MarketId, number> = {
  com: 1,
  fr: 4,
  es: 9,
};

const KEEPA_BASE = 'https://api.keepa.com';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KeepaStats {
  /** [amazon, new, used, salesRank, listPrice, ...] — current values */
  current: number[];
  avg: number[];
  min: number[];
  max: number[];
}

interface KeepaProduct {
  asin: string;
  domainId: number;
  title: string;
  csv: (number[] | null)[];
  stats?: KeepaStats;
  salesRank?: number;
}

interface KeepaResponse {
  status: 'OK' | 'PENDING' | 'ERROR' | 'REQUEST_REJECTED';
  tokensLeft: number;
  refillIn: number;
  refillRate: number;
  requestTime: number;
  error?: string;
  products?: KeepaProduct[];
}

export interface KeepaProductData {
  asin: string;
  /** Current price in real currency units (e.g. 19.99). null = unavailable */
  price: number | null;
  /** Best Seller Rank (lower = better). null = not ranked */
  salesRank: number | null;
  available: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert Keepa integer price to real decimal. -1 means not available. */
function keepaIntToDecimal(raw: number): number | null {
  if (raw === -1 || raw <= 0) return null;
  return raw / 100;
}

/** Pick best current price: prefers Amazon price, falls back to new marketplace */
function getBestPrice(stats: KeepaStats | undefined): number | null {
  if (!stats) return null;
  const amazonPrice = keepaIntToDecimal(stats.current[0] ?? -1);
  if (amazonPrice !== null) return amazonPrice;
  return keepaIntToDecimal(stats.current[1] ?? -1);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch current price + BSR for a batch of ASINs on a given market.
 * Max 100 ASINs per call (Keepa limit).
 */
export async function getProductPrices(
  asins: string[],
  marketId: MarketId,
  apiKey = process.env.KEEPA_API_KEY
): Promise<KeepaProductData[]> {
  if (!apiKey) {
    console.warn('[Keepa] KEEPA_API_KEY not set — returning mock data');
    return asins.map((asin) => ({
      asin,
      price: null,
      salesRank: null,
      available: false,
    }));
  }

  if (asins.length === 0) return [];

  const batch = asins.slice(0, 100);
  const domain = KEEPA_DOMAIN[marketId];

  const params = new URLSearchParams({
    key: apiKey,
    domain: String(domain),
    asin: batch.join(','),
    stats: '90',    // statistics window: 90 days
    history: '0',  // skip full price history to save tokens
    rating: '0',   // skip rating data
    offers: '0',   // skip offers list
  });

  const res = await fetch(`${KEEPA_BASE}/product?${params}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    // No caching — we always want live prices
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`[Keepa] HTTP ${res.status}: ${res.statusText}`);
  }

  const data: KeepaResponse = await res.json();

  if (data.status !== 'OK' || !data.products) {
    throw new Error(`[Keepa] API error: ${data.error ?? data.status}`);
  }

  console.log(
    `[Keepa] ${marketId.toUpperCase()} — fetched ${data.products.length} products. ` +
    `Tokens left: ${data.tokensLeft} (refill in ${Math.round(data.refillIn / 1000)}s)`
  );

  return data.products.map((p) => {
    const price = getBestPrice(p.stats);
    const rawBsr = p.stats?.current[3] ?? p.salesRank ?? -1;
    const salesRank = rawBsr > 0 ? rawBsr : null;

    return {
      asin: p.asin,
      price,
      salesRank,
      available: price !== null,
    };
  });
}

/**
 * Check how many API tokens are available.
 * Useful before large batch jobs.
 */
export async function getTokenStatus(
  apiKey = process.env.KEEPA_API_KEY
): Promise<{ tokensLeft: number; refillRate: number; refillIn: number }> {
  if (!apiKey) return { tokensLeft: 0, refillRate: 0, refillIn: 0 };

  const res = await fetch(
    `${KEEPA_BASE}/token?key=${apiKey}`,
    { cache: 'no-store' }
  );
  const data = await res.json();
  return {
    tokensLeft: data.tokensLeft ?? 0,
    refillRate: data.refillRate ?? 0,
    refillIn: data.refillIn ?? 0,
  };
}

/**
 * Process a large list of ASINs in batches of 100,
 * respecting Keepa's 1 req/sec rate limit between batches.
 */
export async function getProductPricesBatched(
  asins: string[],
  marketId: MarketId,
  apiKey = process.env.KEEPA_API_KEY
): Promise<KeepaProductData[]> {
  const results: KeepaProductData[] = [];
  const BATCH_SIZE = 100;

  for (let i = 0; i < asins.length; i += BATCH_SIZE) {
    const batch = asins.slice(i, i + BATCH_SIZE);
    const batchResults = await getProductPrices(batch, marketId, apiKey);
    results.push(...batchResults);

    // Keepa: 1 token/sec refill, each product costs ~10 tokens
    // Wait 1.2s between batches to avoid exhausting tokens
    if (i + BATCH_SIZE < asins.length) {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  return results;
}
