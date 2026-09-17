/**
 * /api/market/amazon — widget "Bestsellers Amazon" de l'onglet Étude de
 * marché. Scraping HTML direct (fragile, contraire aux CGU Amazon,
 * conservé comme source de secours dégradée — cf.
 * lib/integrations/data-sources/amazon-scraping-fallback.ts pour la
 * version "source du registre"). Cette route reste séparée du registre
 * Sprint 3 : c'est un widget d'affichage rapide, pas une source agrégée
 * dans market_products.
 *
 * Sprint 4 : paramétrée par marché (fr/es/uk), au lieu d'amazon.fr en dur.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getActiveMarket } from '@/lib/get-active-market';
import { isValidMarket, type Market } from '@/lib/market';

const AMAZON_DOMAIN: Record<Market, string> = { fr: 'amazon.fr', es: 'amazon.es', uk: 'amazon.co.uk' };
const LOCALE: Record<Market, string> = { fr: 'fr-FR,fr;q=0.9', es: 'es-ES,es;q=0.9,en;q=0.8', uk: 'en-GB,en;q=0.9' };

const CATEGORY_PATHS: { name: string; path: string; emoji: string }[] = [
  { name: 'Tech & Gadgets', path: 'electronics', emoji: '💻' },
  { name: 'Mode & Beauté', path: 'beauty', emoji: '💄' },
  { name: 'Lifestyle & Maison', path: 'home', emoji: '🏠' },
  { name: 'Sport & Bien-être', path: 'sports', emoji: '🏋️' },
  { name: 'Art & Créativité', path: 'handmade', emoji: '🎨' },
];

// Cache par marché — évite qu'un refresh sur un marché n'écrase le cache
// des deux autres (bug qu'aurait introduit un cache global partagé).
const cache: Partial<Record<Market, { data: unknown; fetchedAt: number }>> = {};
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 heures

function categoryUrl(market: Market, path: string): string {
  return `https://www.${AMAZON_DOMAIN[market]}/gp/bestsellers/${path}/`;
}

async function scrapeAmazonCategory(market: Market, category: (typeof CATEGORY_PATHS)[0]) {
  const domain = AMAZON_DOMAIN[market];
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': LOCALE[market],
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    Referer: `https://www.${domain}/`,
  };

  const url = categoryUrl(market, category.path);

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { ...category, url, products: [], error: `HTTP ${res.status}` };

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
          .find('.p13n-sc-truncate-desktop-type2, .p13n-sc-truncated, [class*="p13n-sc-truncate"]')
          .first()
          .text()
          .trim() ||
        $el.find('img').attr('alt') ||
        '';
      const price = $el.find('.p13n-sc-price, .a-price .a-offscreen').first().text().trim() || '';
      const rating = $el.find('.a-icon-alt').first().text().trim() || '';
      const image = $el.find('img').first().attr('src') || '';
      const href = $el.find('a').first().attr('href') || '';
      const itemUrl = href.startsWith('http') ? href : `https://www.${domain}${href}`;

      if (name) {
        products.push({ rank: i + 1, name: name.slice(0, 80), price, rating, image, url: itemUrl });
      }
    });

    return { ...category, url, products, error: null };
  } catch (err) {
    return { ...category, url, products: [], error: String(err) };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requested = searchParams.get('market');
  const market: Market = isValidMarket(requested) ? requested : getActiveMarket();

  const cached = cache[market];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ market, data: cached.data, cached: true, fetchedAt: new Date(cached.fetchedAt).toISOString() });
  }

  const results = await Promise.all(CATEGORY_PATHS.map((c) => scrapeAmazonCategory(market, c)));
  cache[market] = { data: results, fetchedAt: Date.now() };

  return NextResponse.json({ market, data: results, cached: false, fetchedAt: new Date().toISOString() });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requested = searchParams.get('market');
  if (isValidMarket(requested)) {
    delete cache[requested];
  } else {
    for (const key of Object.keys(cache)) delete cache[key as Market];
  }
  return NextResponse.json({ success: true, message: 'Cache vidé' });
}
