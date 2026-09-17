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
 * Auth: Bearer PIPELINE_SECRET (ou ADMIN_SECRET)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, generateSlug } from '@/lib/supabase';
import { DEFAULT_MARKET, isValidMarket, type Market } from '@/lib/market';
import amazonScrapingFallback from '@/lib/integrations/data-sources/amazon-scraping-fallback';
import { scoreSignal, trendScoreFromScore } from '@/lib/market/scoring';
import type { RawProductSignal } from '@/lib/integrations/types';

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  const secret = process.env.PIPELINE_SECRET || process.env.ADMIN_SECRET || '';
  return token === secret;
}

function marketFrom(value: unknown): Market {
  return typeof value === 'string' && isValidMarket(value) ? value : DEFAULT_MARKET;
}

async function discoverAndScore(market: Market) {
  const signals = await amazonScrapingFallback.fetchTrendingProducts(market);
  return signals
    .map((signal) => ({ signal, ...scoreSignal(signal) }))
    .sort((a, b) => b.score - a.score);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const market = marketFrom(body.market);
  const threshold: number = body.threshold ?? 60;
  const dryRun: boolean = body.dry_run ?? false;
  const maxImport: number = body.max_import ?? 5;

  const scored = await discoverAndScore(market);
  const candidates = scored.filter((p) => p.score >= threshold);

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      market,
      total_scraped: scored.length,
      candidates: candidates.length,
      threshold,
      top20: scored.slice(0, 20).map(({ signal, score }) => ({
        name: signal.name,
        score,
        category: signal.category,
        price: signal.price,
        rating: signal.rating,
        reviews: signal.reviewCount,
      })),
    });
  }

  const sb = getSupabaseAdmin();
  const toImport = candidates.slice(0, maxImport);
  const imported = [];
  const skipped = [];

  for (const { signal, score } of toImport) {
    const slug = generateSlug(signal.name);
    const { data: existing } = await sb.from('products').select('id').eq('slug', slug).maybeSingle();

    if (existing) {
      skipped.push({ name: signal.name, reason: 'already exists' });
      continue;
    }

    const { data: product, error } = await sb
      .from('products')
      .insert({
        name: signal.name,
        slug,
        affiliate_url: signal.url,
        price: signal.price,
        image_url: signal.image || null,
        description: `${signal.category || ''} — ${signal.rating ? `Note : ${signal.rating}/5` : ''} ${
          signal.reviewCount ? `(${signal.reviewCount} avis)` : ''
        }`.trim(),
        market,
        product_source: 'auto_discovered',
        active: false,
      })
      .select()
      .single();

    if (error) {
      skipped.push({ name: signal.name, reason: error.message });
    } else {
      imported.push({ id: product.id, name: signal.name, slug, score });
    }
  }

  return NextResponse.json({
    success: true,
    market,
    total_scraped: scored.length,
    candidates: candidates.length,
    imported: imported.length,
    skipped: skipped.length,
    imported_products: imported,
    skipped_products: skipped,
    threshold,
  });
}

// GET = dry run preview
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const market = marketFrom(searchParams.get('market'));

  const scored = await discoverAndScore(market);

  return NextResponse.json({
    market,
    total_scraped: scored.length,
    top20: scored.slice(0, 20).map(({ signal, score }: { signal: RawProductSignal; score: number }) => ({
      name: signal.name,
      score,
      category: signal.category,
      price: signal.price,
      rating: signal.rating,
      reviews: signal.reviewCount,
      url: signal.url,
    })),
  });
}
