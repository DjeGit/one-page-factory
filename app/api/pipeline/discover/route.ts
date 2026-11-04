/**
 * /api/pipeline/discover (Sprint 4 — réécriture)
 *
 * AVANT : scraping cheerio Amazon.fr en dur sur 4 catégories fixes, avec
 * son propre scoring dupliqué.
 *
 * MAINTENANT : paramétré par marché, branché sur
 * lib/integrations/data-sources/amazon-scraping-fallback.ts (même client
 * que le registre Sprint 3, généralisé aux 3 marchés) et sur le scoring
 * partagé lib/market/scoring.ts. Reste un import direct dans `products`
 * (au-dessus du seuil = auto-import), distinct de market_products (étude
 * de marché, cf. app/api/market/refresh).
 *
 * POST/GET body|query : { market?: 'fr'|'es'|'uk', threshold?: number (0-100, default 60), dry_run?: boolean, max_import?: number }
 * Auth: Bearer PIPELINE_SECRET (ou ADMIN_SECRET) ou cookie admin
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, readOptionalJsonObject, unauthorized } from '../../_lib/http';
import { discoverAndScore, marketFrom, parseDiscoverParams, runDiscover } from '../../_lib/pipeline-discover';
import { isValidMarket } from '@/lib/market';

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();

  const parsed = await readOptionalJsonObject(req);
  if ('response' in parsed) return parsed.response;
  const p = parseDiscoverParams(parsed.body);
  if ('error' in p) return badRequest(p.error);

  const r = await runDiscover(p.params);
  return NextResponse.json(r.body, { status: r.status });
}

// GET = dry run preview
export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();

  const { searchParams } = new URL(req.url);
  const rawMarket = searchParams.get('market');
  if (rawMarket && !isValidMarket(rawMarket)) return badRequest('Marché invalide (fr, es ou uk)');
  const market = marketFrom(rawMarket);

  try {
    const scored = await discoverAndScore(market);
    return NextResponse.json({
      market,
      total_scraped: scored.length,
      top20: scored.slice(0, 20).map(({ signal, score }) => ({
        name: signal.name,
        score,
        category: signal.category,
        price: signal.price,
        rating: signal.rating,
        reviews: signal.reviewCount,
        url: signal.url,
      })),
    });
  } catch (err) {
    console.error('[api] pipeline/discover (aperçu) :', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "La source de produits (Amazon) n'a pas répondu. Réessayez plus tard." }, { status: 502 });
  }
}
