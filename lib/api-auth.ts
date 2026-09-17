/**
 * Internal API authentication
 * All /api/sync/* and /api/scores/* routes are internal (cron-only).
 * Protected by a Bearer token stored in INTERNAL_API_KEY env var.
 *
 * Usage:
 *   const authError = requireInternalAuth(request);
 *   if (authError) return authError;
 */
import { NextRequest, NextResponse } from 'next/server';

export function requireInternalAuth(request: NextRequest): NextResponse | null {
  const apiKey = process.env.INTERNAL_API_KEY;

  if (!apiKey) {
    // If key not configured, block all calls in production; allow in dev
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'INTERNAL_API_KEY not configured on server' },
        { status: 500 }
      );
    }
    // Dev: warn and allow
    console.warn('[Auth] INTERNAL_API_KEY not set — allowing request in dev mode');
    return null;
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (token !== apiKey) {
    return NextResponse.json(
      { error: 'Unauthorized — invalid API key' },
      { status: 401 }
    );
  }

  return null; // auth passed
}

/** Helper to log sync operations to market_sync_log */
export async function logSyncStart(
  marketId: string,
  syncType: 'prices' | 'availability' | 'trending'
): Promise<number> {
  const { query } = await import('./db');
  const rows = await query<{ id: number }>(
    `INSERT INTO market_sync_log (market_id, sync_type, status, started_at)
     VALUES ($1, $2, 'running', NOW())
     RETURNING id`,
    [marketId, syncType]
  );
  return rows[0]?.id ?? 0;
}

export async function logSyncEnd(
  logId: number,
  status: 'success' | 'error',
  productsSynced: number,
  errorsCount: number,
  errorMessage?: string
): Promise<void> {
  const { query } = await import('./db');
  await query(
    `UPDATE market_sync_log
     SET status = $1, products_synced = $2, errors_count = $3,
         error_message = $4, finished_at = NOW()
     WHERE id = $5`,
    [status, productsSynced, errorsCount, errorMessage ?? null, logId]
  );
}
