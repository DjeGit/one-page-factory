/**
 * /api/pipeline/discover
 *
 * Scrape Amazon Best Sellers (free, no API key), score each product,
 * and auto-import those above the threshold.
 *
 * POST body: { threshold?: number (0-100, default 60), dry_run?: boolean }
 * Auth: Bearer PIPELINE_SECRET (or ADMIN_SECRET)
 */
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getSupabaseAdmin, generateSlug } from '@/lib/supabase';

// ─── Auth guard ────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  const secret = process.env.PIPELINE_SECRET || process.env.ADMIN_SECRET || '';
  return token === secret;
}

// ─── Amazon categories to monitor ─────────────────────────────────────────

const CATEGORIES = [
  { name: 'Tech & Gadgets',      url: 'https://www.amazon.fr/gp/bestsellers/electronics/', emoji: '💻' },
  { name: 'Mode & Beauté',       url: 'https://www.amazon.fr/gp/bestsellers/beauty/',      emoji: '💄' },
  { name: 'Maison & Déco',       url: 'https://www.amazon.fr/gp/bestsellers/home/',        emoji: '🏠' },
  { name: 'Sport & Bien-être',   url: 'https://www.amazon.fr/gp/bestsellers/sports/',      emoji: '🏋️' },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  Referer: 'https://www.amazon.fr/',
};

// ─── Scraper ───────────────────────────────────────────────────────────────

interface RawProduct {
  rank: number;
  name: string;
  price: number | null;
  rating: number | null;
  reviewCount: number;
  image: string;
  url: string;
  category: string;
  categoryEmoji: string;
}

async function scrapeCategory(cat: typeof CATEGORIES[0]): Promise<RawProduct[]> {
  try {
    const res = await fetch(cat.url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const products: RawProduct[] = [];

    $('[data-asin]').each((i, el) => {
      if (i >= 20) return false;
      const $el = $(el);
      const asin = $el.attr('data-asin');
      if (!asin) return;

      const name = $el.find('[class*="p13n-sc-truncate"], .p13n-sc-truncated').first().text().trim()
        || $el.find('img').first().attr('alt')
        || '';
      if (!name || name.length < 5) return;

      const priceText = $el.find('.p13n-sc-price, .a-price .a-offscreen').first().text().trim();
      const price = priceText
        ? parseFloat(priceText.replace(/[^0-9,]/g, '').replace(',', '.')) || null
        : null;

      const ratingText = $el.find('.a-icon-alt').first().text().trim();
      const rating = ratingText ? parseFloat(ratingText.split(' ')[0].replace(',', '.')) : null;

      const reviewText = $el.find('.a-size-small.a-link-normal').first().text().trim();
      const reviewCount = parseInt(reviewText.replace(/[^0-9]/g, '') || '0', 10);

      const image = $el.find('img').first().attr('src') || '';
      const url = `https://www.amazon.fr/dp/${asin}`;

      products.push({
        rank: i + 1,
        name: name.slice(0, 120),
        price,
        rating,
        reviewCount,
        image,
        url,
        category: cat.name,
        categoryEmoji: cat.emoji,
      });
    });

    return products;
  } catch {
    return [];
  }
}

// ─── Scoring engine ────────────────────────────────────────────────────────
//
// Score 0-100 based on:
//   - BSR rank (top 5 = 30pts, top 10 = 20pts, top 20 = 10pts)
//   - Rating      (>= 4.5 = 25pts, >= 4.0 = 15pts)
//   - Review count (>= 1000 = 20pts, >= 100 = 10pts)
//   - Price sweet spot (10–80€ = 15pts, 80–150€ = 10pts)
//   - Has image    (+10pts)

interface ScoredProduct extends RawProduct {
  score: number;
  score_breakdown: Record<string, number>;
}

function scoreProduct(p: RawProduct): ScoredProduct {
  const breakdown: Record<string, number> = {};

  // Rank score
  if (p.rank <= 5)       breakdown.rank = 30;
  else if (p.rank <= 10) breakdown.rank = 20;
  else                   breakdown.rank = 10;

  // Rating score
  if (p.rating && p.rating >= 4.5)      breakdown.rating = 25;
  else if (p.rating && p.rating >= 4.0) breakdown.rating = 15;
  else                                   breakdown.rating = 0;

  // Review count score
  if (p.reviewCount >= 1000)      breakdown.reviews = 20;
  else if (p.reviewCount >= 100)  breakdown.reviews = 10;
  else                            breakdown.reviews = 0;

  // Price sweet spot score
  if (p.price && p.price >= 10 && p.price <= 80)        breakdown.price = 15;
  else if (p.price && p.price > 80 && p.price <= 150)   breakdown.price = 10;
  else                                                    breakdown.price = 0;

  // Image bonus
  breakdown.image = p.image ? 10 : 0;

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { ...p, score, score_breakdown: breakdown };
}

// ─── Main handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const threshold: number = body.threshold ?? 60;
  const dryRun: boolean = body.dry_run ?? false;
  const maxImport: number = body.max_import ?? 5;

  // Scrape all categories
  const allRaw = (
    await Promise.all(CATEGORIES.map(scrapeCategory))
  ).flat();

  // Score
  const scored = allRaw.map(scoreProduct).sort((a, b) => b.score - a.score);

  // Filter above threshold
  const candidates = scored.filter((p) => p.score >= threshold);

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      total_scraped: allRaw.length,
      candidates: candidates.length,
      threshold,
      top20: scored.slice(0, 20).map((p) => ({
        name: p.name,
        score: p.score,
        rank: p.rank,
        category: p.category,
        price: p.price,
        rating: p.rating,
        reviews: p.reviewCount,
      })),
    });
  }

  // Check which names are already in DB
  const sb = getSupabaseAdmin();
  const toImport = candidates.slice(0, maxImport);
  const imported = [];
  const skipped = [];

  for (const p of toImport) {
    const slug = generateSlug(p.name);
    const { data: existing } = await sb
      .from('products')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      skipped.push({ name: p.name, reason: 'already exists' });
      continue;
    }

    const redirectCode =
      Math.random().toString(36).substring(2, 10) +
      Math.random().toString(36).substring(2, 10);

    const { data: product, error } = await sb
      .from('products')
      .insert({
        name: p.name,
        slug,
        affiliate_url: p.url,
        price: p.price,
        image_url: p.image || null,
        description: `${p.category} — Rang #${p.rank} Amazon Best Sellers. ${p.rating ? `Note: ${p.rating}/5` : ''} ${p.reviewCount ? `(${p.reviewCount} avis)` : ''}`.trim(),
        redirect_code: redirectCode,
        active: false,
      })
      .select()
      .single();

    if (error) {
      skipped.push({ name: p.name, reason: error.message });
    } else {
      imported.push({ id: product.id, name: p.name, slug, score: p.score });
    }
  }

  return NextResponse.json({
    success: true,
    total_scraped: allRaw.length,
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

  const allRaw = (await Promise.all(CATEGORIES.map(scrapeCategory))).flat();
  const scored = allRaw.map(scoreProduct).sort((a, b) => b.score - a.score);

  return NextResponse.json({
    total_scraped: allRaw.length,
    top20: scored.slice(0, 20).map((p) => ({
      name: p.name,
      score: p.score,
      rank: p.rank,
      category: p.category,
      price: p.price,
      rating: p.rating,
      reviews: p.reviewCount,
      url: p.url,
    })),
  });
}
