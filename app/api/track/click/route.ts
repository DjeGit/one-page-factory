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
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, createRateLimiter, getClientIp, intParam, isUuid, serverError, unauthorized } from '../../_lib/http';
import { isLegacyMarket } from '../../_lib/legacy-sync-input';

// Plafond par adresse IP (la limite par session ci-dessous se contourne en changeant d'identifiant de session).
const ipLimiter = createRateLimiter(120, 60_000);

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
  const ip = getClientIp(request.headers);
  if (ip && !ipLimiter.allow(ip)) {
    return NextResponse.json({ tracked: false, reason: 'rate_limited' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return badRequest('Invalid JSON');
    body = parsed as Record<string, unknown>;
  } catch {
    return badRequest('Invalid JSON');
  }

  const { product_id, market_id } = body;
  const session_id = typeof body.session_id === 'string' ? body.session_id.slice(0, 100) : undefined;

  if (typeof product_id !== 'string' || !isUuid(product_id)) {
    return badRequest('product_id (UUID) required');
  }

  if (!isLegacyMarket(market_id)) {
    return badRequest('market_id must be fr, es, or com');
  }

  // Rate limiting
  const sid = session_id ?? ip ?? 'anonymous';
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

/** GET — click stats for dashboard (admin uniquement : avant, ouvert à tout visiteur) */
export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) return unauthorized();

  const { searchParams } = new URL(request.url);
  const market = searchParams.get('market') ?? 'fr';
  if (!isLegacyMarket(market)) return badRequest('market invalide : fr, es ou com');
  const days = intParam(searchParams.get('days'), 30, 1, 90);

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
    console.error('[ClickTrack] statistiques :', err instanceof Error ? err.message : err);
    return serverError('Erreur de base de données');
  }
}
