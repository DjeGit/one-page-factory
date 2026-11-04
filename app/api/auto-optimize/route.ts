/**
 * /api/auto-optimize
 *
 * Analyse les performances de tous les produits actifs et applique des règles
 * automatiques :
 *
 * PAUSE  → si views >= MIN_VIEWS et CTR < PAUSE_THRESHOLD (0.5%)
 * FLAG   → si views >= MIN_VIEWS et CTR >= SCALE_THRESHOLD (5%) → signalé dans la réponse (aucune action)
 *
 * POST body: { dry_run?: boolean, min_views?: number, pause_threshold?: number, scale_threshold?: number, market?: 'fr'|'es'|'uk' }
 * Auth: cookie admin ou Bearer PIPELINE_SECRET (ou ADMIN_SECRET)
 *
 * Une pause est PAR MARCHÉ (la fiche FR peut être mauvaise alors que la fiche ES est bonne) : elle ne se
 * propage donc pas aux autres marchés, contrairement à une désactivation manuelle (lib/market-sync.ts).
 * La catégorie du produit disparaît d'elle-même du site si c'était son dernier produit en ligne.
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, readOptionalJsonObject, unauthorized } from '../_lib/http';
import { DEFAULT_MIN_VIEWS, parseOptimizeParams, runAutoOptimize } from '../_lib/auto-optimize';

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();

  const parsed = await readOptionalJsonObject(req);
  if ('response' in parsed) return parsed.response;

  const p = parseOptimizeParams(parsed.body);
  if ('error' in p) return badRequest(p.error);

  const r = await runAutoOptimize(p.params);
  return NextResponse.json(r.body, { status: r.status });
}

// GET = aperçu des règles sans rien appliquer
export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const r = await runAutoOptimize({ dryRun: true, minViews: DEFAULT_MIN_VIEWS, pauseThreshold: 0.5, scaleThreshold: 5.0 });
  return NextResponse.json(r.body, { status: r.status });
}
