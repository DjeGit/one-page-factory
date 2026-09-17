/**
 * ═══════════════════════════════════════════════════════
 * API #1 — PRICE SYNC ENGINE
 * Route: POST /api/sync/prices
 * ═══════════════════════════════════════════════════════
 *
 * Fetches current Amazon prices via Keepa for all products
 * that have an ASIN in a given market, updates the database,
 * and dispatches price drop alerts when thresholds are met.
 *
 * Called by cron job every 6 hours.
 *
 * Body (optional):
 * {
 *   "markets": ["fr", "es", "com"],   // default: all active markets
 *   "product_ids": [1, 2, 3],          // default: all products with ASIN
 *   "alert_threshold_pct": 5           // default: 5% price drop triggers alert
 * }
 *
 * Auth: Authorization: Bearer ${INTERNAL_API_KEY}
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getProductPricesBatched, type MarketId } from '@/lib/keepa';
import { dispatchPriceAlert } from '@/lib/opf-notify';
import { requireInternalAuth, logSyncStart, logSyncEnd } from '@/lib/api-auth';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Product {
  id: string;  // UUID (Supabase)
  name: string;
  image_url: string | null;
  affiliate_url_fr: string | null;
  affiliate_url_es: string | null;
  affiliate_url_com: string | null;
  asin_fr: string | null;
  asin_es: string | null;
  asin_com: string | null;
  price_fr: number | null;
  price_es: number | null;
  price_com: number | null;
}

interface SyncResult {
  market: MarketId;
  productsChecked: number;
  pricesUpdated: number;
  priceDropAlerts: number;
  errors: string[];
  durationMs: number;
}

// ─── Market config ───────────────────────────────────────────────────────────

const MARKET_CONFIG: Record<
  MarketId,
  {
    asinCol: keyof Product;
    priceCol: string;
    availableCol: string;
    urlCol: keyof Product;
    currency: string;
    currencySymbol: string;
  }
> = {
  fr: {
    asinCol: 'asin_fr',
    priceCol: 'price_fr',
    availableCol: 'available_fr',
    urlCol: 'affiliate_url_fr',
    currency: 'EUR',
    currencySymbol: '€',
  },
  es: {
    asinCol: 'asin_es',
    priceCol: 'price_es',
    availableCol: 'available_es',
    urlCol: 'affiliate_url_es',
    currency: 'EUR',
    currencySymbol: '€',
  },
  com: {
    asinCol: 'asin_com',
    priceCol: 'price_com',
    availableCol: 'available_com',
    urlCol: 'affiliate_url_com',
    currency: 'USD',
    currencySymbol: '$',
  },
};

const ACTIVE_MARKETS: MarketId[] = ['fr', 'es', 'com'];

// ─── Core sync function ──────────────────────────────────────────────────────

async function syncMarketPrices(
  marketId: MarketId,
  products: Product[],
  alertThreshold: number
): Promise<SyncResult> {
  const start = Date.now();
  const config = MARKET_CONFIG[marketId];
  const errors: string[] = [];
  let pricesUpdated = 0;
  let alertsSent = 0;
  let logId = 0;
  try {
    logId = await logSyncStart(marketId, 'prices');
  } catch (dbErr) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    console.error('[Sync] DB unavailable:', msg);
    return NextResponse.json({ error: 'Database unavailable', detail: msg }, { status: 503 });
  }

  try {
    // Filter products with an ASIN for this market
    const withAsin = products.filter((p) => p[config.asinCol]);
    const asins = withAsin.map((p) => p[config.asinCol] as string);

    if (asins.length === 0) {
      await logSyncEnd(logId, 'success', 0, 0);
      return {
        market: marketId,
        productsChecked: 0,
        pricesUpdated: 0,
        priceDropAlerts: 0,
        errors: [],
        durationMs: Date.now() - start,
      };
    }

    console.log(`[PriceSync] ${marketId.toUpperCase()} — checking ${asins.length} ASINs`);

    // Fetch from Keepa
    const keepaData = await getProductPricesBatched(asins, marketId);
    const keepaMap = new Map(keepaData.map((d) => [d.asin, d]));

    // Update DB in a transaction
    await withTransaction(async (client) => {
      for (const product of withAsin) {
        const asin = product[config.asinCol] as string;
        const kd = keepaMap.get(asin);
        if (!kd) continue;

        const oldPrice = product[config.priceCol as keyof Product] as number | null;
        const newPrice = kd.price;

        // Update price, availability, BSR
        const bsrCol = `bsr_${marketId}`;
        await client.query(
          `UPDATE products
           SET ${config.priceCol} = $1,
               ${config.availableCol} = $2,
               ${bsrCol} = $3,
               price_updated_at = NOW()
           WHERE id = $4`,
          [newPrice, kd.available, kd.salesRank, product.id]
        );

        // Insert into price history
        if (newPrice !== null) {
          await client.query(
            `INSERT INTO market_prices (product_id, market_id, price, currency, available, source, recorded_at)
             VALUES ($1, $2, $3, $4, $5, 'keepa', NOW())`,
            [product.id, marketId, newPrice, config.currency, kd.available]
          );
        }

        pricesUpdated++;

        // Check for price drop alert
        if (
          oldPrice !== null &&
          newPrice !== null &&
          newPrice < oldPrice
        ) {
          const affiliateUrl = product[config.urlCol] as string | null;
          if (affiliateUrl) {
            const { sent, dropPct } = await dispatchPriceAlert(
              {
                productId: product.id,
                productName: product.name,
                imageUrl: product.image_url ?? undefined,
                oldPrice,
                newPrice,
                marketId,
                affiliateUrl,
                currency: config.currency,
                currencySymbol: config.currencySymbol,
                category: undefined,
              },
              alertThreshold
            );
            if (sent) {
              console.log(
                `[PriceSync] Alert sent — #${product.id} ${product.name} ` +
                `${config.currencySymbol}${oldPrice} → ${config.currencySymbol}${newPrice} (−${dropPct}%)`
              );
              alertsSent++;
            }
          }
        }
      }
    });

    await logSyncEnd(logId, 'success', pricesUpdated, errors.length);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    await logSyncEnd(logId, 'error', pricesUpdated, errors.length, msg);
    console.error(`[PriceSync] ${marketId.toUpperCase()} error:`, msg);
  }

  return {
    market: marketId,
    productsChecked: products.length,
    pricesUpdated,
    priceDropAlerts: alertsSent,
    errors,
    durationMs: Date.now() - start,
  };
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  const globalStart = Date.now();

  let body: {
    markets?: MarketId[];
    product_ids?: string[];  // UUIDs
    alert_threshold_pct?: number;
  } = {};

  try {
    body = await request.json();
  } catch {
    // Empty body is fine — use defaults
  }

  const markets = body.markets ?? ACTIVE_MARKETS;
  const alertThreshold = body.alert_threshold_pct ?? 5;

  // Fetch products from DB
  let products: Product[];
  try {
    const productFilter =
      body.product_ids && body.product_ids.length > 0
        ? `AND p.id = ANY($1::uuid[])`
        : '';
    const params = body.product_ids?.length ? [body.product_ids] : [];

    products = await query<Product>(
      `SELECT p.id, p.name, p.image_url,
              p.affiliate_url_fr, p.affiliate_url_es, p.affiliate_url_com,
              p.asin_fr, p.asin_es, p.asin_com,
              p.price_fr, p.price_es, p.price_com
       FROM products p
       WHERE 1=1 ${productFilter}
       ORDER BY p.id`,
      params
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `DB error: ${msg}` }, { status: 500 });
  }

  // Run syncs in sequence (to respect Keepa rate limits)
  const results: SyncResult[] = [];
  for (const marketId of markets) {
    if (!ACTIVE_MARKETS.includes(marketId)) continue;
    const result = await syncMarketPrices(marketId, products, alertThreshold);
    results.push(result);
  }

  const totalUpdated = results.reduce((s, r) => s + r.pricesUpdated, 0);
  const totalAlerts = results.reduce((s, r) => s + r.priceDropAlerts, 0);
  const totalErrors = results.flatMap((r) => r.errors);

  return NextResponse.json({
    success: totalErrors.length === 0,
    durationMs: Date.now() - globalStart,
    summary: {
      marketsProcessed: results.length,
      pricesUpdated: totalUpdated,
      alertsSent: totalAlerts,
      errors: totalErrors.length,
    },
    markets: results,
  });
}

/** GET — quick status check */
export async function GET(request: NextRequest) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  const rows = await query<{
    market_id: string;
    sync_type: string;
    status: string;
    products_synced: number;
    started_at: string;
    finished_at: string;
  }>(
    `SELECT market_id, sync_type, status, products_synced, started_at, finished_at
     FROM market_sync_log
     WHERE sync_type = 'prices'
     ORDER BY started_at DESC
     LIMIT 9`
  );

  return NextResponse.json({ recentSyncs: rows });
}
