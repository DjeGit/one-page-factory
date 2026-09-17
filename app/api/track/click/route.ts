/**
 * ═══════════════════════════════════════════════════════
 * Click Tracking API
 * Route: POST /api/track/click
 * ═══════════════════════════════════════════════════════
 *
 * Records affiliate link clicks for:
 *   1. Trending score calculation (click velocity signal)
 *   2. Dashboard analytics (clics affiliés)
 *   3. Revenue attribution per market
 *
 * Called from the frontend when user clicks "Voir le produit" or "Acheter".
 * No auth required (public endpoint) — abuse protected by rate limiting.
 *
 * Body:
 * {
 *   "product_id": 42,
 *   "market_id": "fr",
 *   "session_id": "abc123"   // optional, anonymous session ID from localStorage
 * }
 *
 * Usage in frontend:
 *   await fetch('/api/track/click', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ product_id: product.id, market_id: 'fr', session_id }),
 *   });
 *
 * Note: fire-and-forget is fine — don't await in UI to avoid blocking navigation
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Simple in-memory rate limiter: max 1 click per session per product per minute
const clickRateCache = new Map<string, number>();

function checkRateLimit(sessionId: string, productId: string): boolean {
  const key = `${sessionId}:${productId}`;
  const now = Date.now();
  const lastClick = clickRateCache.get(key) ?? 0;

  if (now - lastClick < 60_000) {
    return false; // rate limited
  }

  clickRateCache.set(key, now);

  // Clean up old entries every 1000 calls
  if (clickRateCache.size > 1000) {
    const cutoff = now - 60_000;
    for (const [k, ts] of Array.from(clickRateCache.entries())) {
      if (ts < cutoff) clickRateCache.delete(k);
    }
  }

  return true;
}

export async function POST(request: NextRequest) {
  let body: {
    product_id?: string;  // UUID (Supabase)
    market_id?: string;
    session_id?: string;
  } = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { product_id, market_id, session_id } = body;

  if (!product_id || typeof product_id !== 'string') {
    return NextResponse.json({ error: 'product_id (UUID) required' }, { status: 400 });
  }

  if (!market_id || !['fr', 'es', 'com'].includes(market_id)) {
    return NextResponse.json({ error: 'market_id must be fr, es, or com' }, { status: 400 });
  }

  // Rate limiting
  const sid = session_id ?? request.headers.get('x-forwarded-for') ?? 'anonymous';
  if (!checkRateLimit(sid, product_id)) {
    // Return 200 to avoid revealing rate limit to client (they don't need to know)
    return NextResponse.json({ tracked: false, reason: 'rate_limited' });
  }

  // Get user agent for analytics
  const userAgent = request.headers.get('user-agent') ?? null;

  try {
    await query(
      `INSERT INTO product_clicks (product_id, market_id, session_id, user_agent, clicked_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [product_id, market_id, session_id ?? null, userAgent?.slice(0, 255) ?? null]
    );

    return NextResponse.json({ tracked: true });
  } catch (err) {
    // Don't expose DB errors — just log and return success
    // (click tracking should never break the user experience)
    console.error('[ClickTrack] DB error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ tracked: false });
  }
}

/** GET — click stats for dashboard */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const market = searchParams.get('market') ?? 'fr';
  const days = Math.min(90, parseInt(searchParams.get('days') ?? '30', 10));

  try {
    const stats = await query<{
      product_id: string;  // UUID
      name: string;
      clicks: number;
      last_click: string;
    }>(
      `SELECT
         c.product_id,
         COALESCE(p.name_fr, p.name) AS name,
         COUNT(c.id)::int AS clicks,
         MAX(c.clicked_at)::text AS last_click
       FROM product_clicks c
       JOIN products p ON p.id = c.product_id
       WHERE c.market_id = $1
         AND c.clicked_at >= NOW() - ($2 || ' days')::interval
       GROUP BY c.product_id, p.name_fr, p.name
       ORDER BY clicks DESC
       LIMIT 20`,
      [market, days]
    );

    const total = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM product_clicks
       WHERE market_id = $1 AND clicked_at >= NOW() - ($2 || ' days')::interval`,
      [market, days]
    );

    return NextResponse.json({
      market,
      days,
      totalClicks: total[0]?.total ?? 0,
      topProducts: stats,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
