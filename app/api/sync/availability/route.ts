/**
 * ═══════════════════════════════════════════════════════
 * API #2 — MARKET AVAILABILITY CHECKER
 * Route: POST /api/sync/availability
 * ═══════════════════════════════════════════════════════
 *
 * Verifies that products are still available on each Amazon market.
 * Uses Keepa to confirm price ≠ null (= in stock with a price).
 *
 * Also detects when a French product is available on ES/COM:
 * If an ASIN exists on FR and Keepa returns a price on ES,
 * it marks the product as available on ES too.
 *
 * Called by cron job every night at 02:00.
 *
 * Body (optional):
 * {
 *   "markets": ["fr", "es", "com"],
 *   "product_ids": [1, 2, 3]
 * }
 *
 * Auth: Authorization: Bearer ${INTERNAL_API_KEY}
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getProductPricesBatched, type MarketId } from '@/lib/keepa';
import { requireInternalAuth, logSyncStart, logSyncEnd } from '@/lib/api-auth';

interface ProductWithAsins {
  id: string;  // UUID (Supabase)
  name: string;
  asin_fr: string | null;
  asin_es: string | null;
  asin_com: string | null;
  available_fr: boolean;
  available_es: boolean;
  available_com: boolean;
}

interface AvailabilityResult {
  market: MarketId;
  checked: number;
  nowAvailable: number;   // became available (was false, now true)
  nowUnavailable: number; // became unavailable (was true, now false)
  unchanged: number;
  durationMs: number;
  errors: string[];
}

const ASIN_COL: Record<MarketId, keyof ProductWithAsins> = {
  fr: 'asin_fr',
  es: 'asin_es',
  com: 'asin_com',
};

const AVAILABLE_COL: Record<MarketId, string> = {
  fr: 'available_fr',
  es: 'available_es',
  com: 'available_com',
};

const PREV_AVAILABLE_COL: Record<MarketId, keyof ProductWithAsins> = {
  fr: 'available_fr',
  es: 'available_es',
  com: 'available_com',
};

async function checkMarketAvailability(
  marketId: MarketId,
  products: ProductWithAsins[]
): Promise<AvailabilityResult> {
  const start = Date.now();
  const errors: string[] = [];
  let nowAvailable = 0;
  let nowUnavailable = 0;
  let unchanged = 0;
  let logId = 0;
  try {
    logId = await logSyncStart(marketId, 'availability');
  } catch (dbErr) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    console.error('[Sync] DB unavailable:', msg);
    // Erreur DB au démarrage : on retourne un AvailabilityResult-shaped avec
    // l'erreur dedans (et non une NextResponse — cette fonction n'est pas un
    // route handler, elle est agrégée par POST plus bas dans results[]).
    return {
      market: marketId,
      checked: 0,
      nowAvailable: 0,
      nowUnavailable: 0,
      unchanged: 0,
      durationMs: Date.now() - start,
      errors: [`Database unavailable: ${msg}`],
    };
  }

  try {
    // Only check products that have an ASIN for this market
    const withAsin = products.filter((p) => p[ASIN_COL[marketId]]);
    const asins = withAsin.map((p) => p[ASIN_COL[marketId]] as string);

    if (asins.length === 0) {
      await logSyncEnd(logId, 'success', 0, 0);
      return {
        market: marketId,
        checked: 0,
        nowAvailable: 0,
        nowUnavailable: 0,
        unchanged: 0,
        durationMs: Date.now() - start,
        errors: [],
      };
    }

    console.log(`[AvailCheck] ${marketId.toUpperCase()} — checking ${asins.length} products`);

    const keepaData = await getProductPricesBatched(asins, marketId);
    const keepaMap = new Map(keepaData.map((d) => [d.asin, d]));

    await withTransaction(async (client) => {
      for (const product of withAsin) {
        const asin = product[ASIN_COL[marketId]] as string;
        const kd = keepaMap.get(asin);
        if (!kd) continue;

        const wasAvailable = product[PREV_AVAILABLE_COL[marketId]] as boolean;
        const isAvailable = kd.available;

        if (wasAvailable === isAvailable) {
          unchanged++;
          continue;
        }

        // Availability changed — update DB
        await client.query(
          `UPDATE products
           SET ${AVAILABLE_COL[marketId]} = $1,
               ${marketId === 'fr' ? 'price_fr' : marketId === 'es' ? 'price_es' : 'price_com'} = $2,
               price_updated_at = NOW()
           WHERE id = $3`,
          [isAvailable, kd.price, product.id]
        );

        if (isAvailable && !wasAvailable) {
          nowAvailable++;
          console.log(
            `[AvailCheck] ✅ ${marketId.toUpperCase()} — Product #${product.id} "${product.name}" is now AVAILABLE`
          );
        } else if (!isAvailable && wasAvailable) {
          nowUnavailable++;
          console.log(
            `[AvailCheck] ❌ ${marketId.toUpperCase()} — Product #${product.id} "${product.name}" is now UNAVAILABLE`
          );
        }
      }
    });

    await logSyncEnd(logId, 'success', withAsin.length, errors.length);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    await logSyncEnd(logId, 'error', 0, 1, msg);
    console.error(`[AvailCheck] ${marketId.toUpperCase()} error:`, msg);
  }

  return {
    market: marketId,
    checked: products.filter((p) => p[ASIN_COL[marketId]]).length,
    nowAvailable,
    nowUnavailable,
    unchanged,
    durationMs: Date.now() - start,
    errors,
  };
}

/**
 * Cross-market discovery:
 * Try the FR ASIN on ES/COM — if Keepa returns a price,
 * the same product exists on that market and we can enable it.
 */
async function discoverCrossMarketAvailability(
  products: ProductWithAsins[]
): Promise<{ discovered: number }> {
  // Products with FR ASIN but no ES/COM ASIN
  const candidates = products.filter(
    (p) => p.asin_fr && (!p.asin_es || !p.asin_com)
  );

  if (candidates.length === 0) return { discovered: 0 };

  let discovered = 0;
  const frAsins = candidates.map((p) => p.asin_fr as string);

  // Try FR ASIN on ES market
  const esData = await getProductPricesBatched(frAsins, 'es');
  const comData = await getProductPricesBatched(frAsins, 'com');

  const esMap = new Map(esData.map((d) => [d.asin, d]));
  const comMap = new Map(comData.map((d) => [d.asin, d]));

  await withTransaction(async (client) => {
    for (const product of candidates) {
      const asin = product.asin_fr!;
      const esResult = esMap.get(asin);
      const comResult = comMap.get(asin);

      if (!product.asin_es && esResult?.available) {
        // Same ASIN works on ES
        await client.query(
          `UPDATE products
           SET asin_es = $1, available_es = true, price_es = $2
           WHERE id = $3`,
          [asin, esResult.price, product.id]
        );
        discovered++;
        console.log(
          `[CrossMarket] 🇪🇸 Discovered ES availability for #${product.id} "${product.name}" (ASIN: ${asin})`
        );
      }

      if (!product.asin_com && comResult?.available) {
        // Same ASIN works on COM
        await client.query(
          `UPDATE products
           SET asin_com = $1, available_com = true, price_com = $2
           WHERE id = $3`,
          [asin, comResult.price, product.id]
        );
        discovered++;
        console.log(
          `[CrossMarket] 🌍 Discovered COM availability for #${product.id} "${product.name}" (ASIN: ${asin})`
        );
      }
    }
  });

  return { discovered };
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  const globalStart = Date.now();

  let body: {
    markets?: MarketId[];
    product_ids?: string[];  // UUIDs
    cross_market_discovery?: boolean;
  } = {};

  try {
    body = await request.json();
  } catch {
    // Use defaults
  }

  const markets: MarketId[] = body.markets ?? ['fr', 'es', 'com'];
  const enableDiscovery = body.cross_market_discovery ?? true;

  // Fetch products
  const productFilter =
    body.product_ids?.length ? `AND id = ANY($1::uuid[])` : '';
  const params = body.product_ids?.length ? [body.product_ids] : [];

  let products: ProductWithAsins[];
  try {
    products = await query<ProductWithAsins>(
      `SELECT id, name,
              asin_fr, asin_es, asin_com,
              available_fr, available_es, available_com
       FROM products
       WHERE 1=1 ${productFilter}
       ORDER BY id`,
      params
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `DB error: ${msg}` }, { status: 500 });
  }

  // Run availability checks per market
  const results: AvailabilityResult[] = [];
  for (const marketId of markets) {
    const result = await checkMarketAvailability(marketId, products);
    results.push(result);
  }

  // Cross-market discovery (optional, uses more Keepa tokens)
  let discovery = { discovered: 0 };
  if (enableDiscovery && process.env.KEEPA_API_KEY) {
    try {
      discovery = await discoverCrossMarketAvailability(products);
    } catch (err) {
      console.error('[AvailCheck] Cross-market discovery error:', err);
    }
  }

  return NextResponse.json({
    success: true,
    durationMs: Date.now() - globalStart,
    summary: {
      marketsChecked: results.length,
      totalBecameAvailable: results.reduce((s, r) => s + r.nowAvailable, 0),
      totalBecameUnavailable: results.reduce((s, r) => s + r.nowUnavailable, 0),
      crossMarketDiscovered: discovery.discovered,
    },
    markets: results,
  });
}

export async function GET(request: NextRequest) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  const stats = await query<{
    market_id: string;
    total: number;
    available: number;
  }>(
    `SELECT
       'fr' AS market_id,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE available_fr = true) AS available
     FROM products
     UNION ALL
     SELECT 'es', COUNT(*), COUNT(*) FILTER (WHERE available_es = true) FROM products
     UNION ALL
     SELECT 'com', COUNT(*), COUNT(*) FILTER (WHERE available_com = true) FROM products`
  );

  return NextResponse.json({ availability: stats });
}
