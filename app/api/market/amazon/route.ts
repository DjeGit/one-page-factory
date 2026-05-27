import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const AMAZON_CATEGORIES = [
  { name: 'Tech & Gadgets', url: 'https://www.amazon.fr/gp/bestsellers/electronics/', emoji: '💻' },
  { name: 'Mode & Beauté', url: 'https://www.amazon.fr/gp/bestsellers/beauty/', emoji: '💄' },
  { name: 'Lifestyle & Maison', url: 'https://www.amazon.fr/gp/bestsellers/home/', emoji: '🏠' },
  { name: 'Sport & Bien-être', url: 'https://www.amazon.fr/gp/bestsellers/sports/', emoji: '🏋️' },
  { name: 'Art & Créativité', url: 'https://www.amazon.fr/gp/bestsellers/handmade/', emoji: '🎨' },
];

let cache: { data: unknown; fetchedAt: number } | null = null;
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

async function scrapeAmazonCategory(category: (typeof AMAZON_CATEGORIES)[0]) {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    Referer: 'https://www.amazon.fr/',
  };

  try {
    const res = await fetch(category.url, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ...category, products: [], error: `HTTP ${res.status}` };

    const html = await res.text();
    const $ = cheerio.load(html);
    const products: {
      rank: number;
      name: string;
      price: string;
      rating: string;
      image: string;
      url: string;
    }[] = [];

    $('.zg-item-immersion, .p13n-sc-uncoverable-faceout, [data-asin]').each((i, el) => {
      if (i >= 10) return false;
      const $el = $(el);

      const name =
        $el
          .find(
            '.p13n-sc-truncate-desktop-type2, .p13n-sc-truncated, [class*="p13n-sc-truncate"]'
          )
          .first()
          .text()
          .trim() ||
        $el.find('img').attr('alt') ||
        '';
      const price = $el.find('.p13n-sc-price, .a-price .a-offscreen').first().text().trim() || '';
      const rating = $el.find('.a-icon-alt').first().text().trim() || '';
      const image = $el.find('img').first().attr('src') || '';
      const href = $el.find('a').first().attr('href') || '';
      const url = href.startsWith('http') ? href : `https://www.amazon.fr${href}`;

      if (name) {
        products.push({ rank: i + 1, name: name.slice(0, 80), price, rating, image, url });
      }
    });

    return { ...category, products, error: null };
  } catch (err) {
    return { ...category, products: [], error: String(err) };
  }
}

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return NextResponse.json({
      data: cache.data,
      cached: true,
      fetchedAt: new Date(cache.fetchedAt).toISOString(),
    });
  }

  const results = await Promise.all(AMAZON_CATEGORIES.map(scrapeAmazonCategory));
  cache = { data: results, fetchedAt: Date.now() };

  return NextResponse.json({
    data: results,
    cached: false,
    fetchedAt: new Date().toISOString(),
  });
}

export async function DELETE() {
  cache = null;
  return NextResponse.json({ success: true, message: 'Cache vidé' });
}
