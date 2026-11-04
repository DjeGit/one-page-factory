import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, createRateLimiter, dbErrorResponse, getClientIp, isUuid, notFound, readJsonObject } from '../../_lib/http';
import { incrementAbCounter, isAbVariant } from '../../_lib/ab-test';

// Route publique (appelée depuis les pages de vente) : paramètres vérifiés,
// et 120 événements par minute et par visiteur au plus.
const limiter = createRateLimiter(120, 60_000);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (ip && !limiter.allow(ip)) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });

  const parsed = await readJsonObject(req);
  if ('response' in parsed) return parsed.response;
  const { test_id, variant, type } = parsed.body;

  if (!isUuid(test_id)) return badRequest('test_id invalide');
  if (!isAbVariant(variant)) return badRequest('variant doit être "a" ou "b"');
  if (type !== 'view' && type !== 'click') return badRequest('type doit être "view" ou "click"');

  const result = await incrementAbCounter(getSupabaseAdmin(), test_id, variant, type === 'view' ? 'views' : 'clicks');
  if (result === 'not_found') return notFound('Test introuvable');
  if (result === 'error') return dbErrorResponse('POST /api/ab-test/track', 'incrément impossible');
  return NextResponse.json({ success: true });
}
