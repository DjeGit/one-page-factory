/**
 * Scraping HTML direct des Amazon Best Sellers — fragile, contraire aux
 * CGU Amazon, casse dès qu'Amazon change son balisage ou bloque l'IP du
 * serveur (déjà signalé par l'audit du 5 sept.). CONSERVÉ uniquement comme
 * source de SECOURS DÉGRADÉE, plus comme source primaire, une fois Amazon
 * Creators API branché — reprend la logique qui existait déjà dans
 * app/api/pipeline/discover/route.ts (généralisée ici aux 3 marchés,
 * l'ancien code ne ciblait qu'amazon.fr en dur).
 */
import * as cheerio from 'cheerio';
import type { Market } from '@/lib/market';
import type { DataSourceClient, RawProductSignal, ConnectionTestResult } from '@/lib/integrations/types';

const AMAZON_DOMAIN: Record<Market, string> = { fr: 'amazon.fr', es: 'amazon.es', uk: 'amazon.co.uk' };
const LOCALE: Record<Market, string> = { fr: 'fr-FR,fr;q=0.9', es: 'es-ES,es;q=0.9', uk: 'en-GB,en;q=0.9' };

const CATEGORY_PATHS: Record<string, string> = {
  'Tech & Gadgets': 'electronics',
  'Mode & Beauté': 'beauty',
  'Maison & Déco': 'home',
  'Sport & Bien-être': 'sports',
};

const HEADERS_BASE = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

async function scrapeCategory(market: Market, categoryName: string, path: string): Promise<RawProductSignal[]> {
  const domain = AMAZON_DOMAIN[market];
  const url = `https://www.${domain}/gp/bestsellers/${path}/`;
  try {
    const res = await fetch(url, {
      headers: { ...HEADERS_BASE, 'Accept-Language': LOCALE[market], Referer: `https://www.${domain}/` },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const signals: RawProductSignal[] = [];

    $('[data-asin]').each((i, el) => {
      if (i >= 20) return false;
      const $el = $(el);
      const asin = $el.attr('data-asin');
      if (!asin) return;
      const name = $el.find('[class*="p13n-sc-truncate"], .p13n-sc-truncated').first().text().trim()
        || $el.find('img').first().attr('alt') || '';
      if (!name || name.length < 5) return;

      const priceText = $el.find('.p13n-sc-price, .a-price .a-offscreen').first().text().trim();
      const price = priceText ? parseFloat(priceText.replace(/[^0-9,.]/g, '').replace(',', '.')) || null : null;
      const ratingText = $el.find('.a-icon-alt').first().text().trim();
      const rating = ratingText ? parseFloat(ratingText.split(' ')[0].replace(',', '.')) : null;
      const reviewText = $el.find('.a-size-small.a-link-normal').first().text().trim();
      const reviewCount = parseInt(reviewText.replace(/[^0-9]/g, '') || '0', 10);
      const image = $el.find('img').first().attr('src') || '';
      const tag = process.env.AMAZON_AFFILIATE_TAG || '';

      signals.push({
        source: 'amazon-scraping-fallback',
        market,
        category: categoryName,
        name: name.slice(0, 120),
        price,
        currency: market === 'uk' ? 'GBP' : 'EUR',
        rating,
        reviewCount,
        bsr: i + 1,
        image,
        url: `https://www.${domain}/dp/${asin}${tag ? `?tag=${tag}` : ''}`,
      });
    });
    return signals;
  } catch {
    return [];
  }
}

const amazonScrapingFallback: DataSourceClient = {
  id: 'amazon-scraping-fallback',
  displayName: 'Amazon (scraping — secours dégradé)',

  isConfigured(): boolean {
    return true; // pas de clé — mais volontairement à activer à la main (fragile, CGU)
  },

  async fetchTrendingProducts(market, category): Promise<RawProductSignal[]> {
    const entries = category
      ? [[category, CATEGORY_PATHS[category] || category] as const]
      : Object.entries(CATEGORY_PATHS);
    const results = await Promise.all(entries.map(([name, path]) => scrapeCategory(market, name, path)));
    return results.flat();
  },

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const res = await fetch(`https://www.${AMAZON_DOMAIN.fr}/gp/bestsellers/electronics/`, {
        headers: HEADERS_BASE,
        signal: AbortSignal.timeout(10000),
      });
      return res.ok
        ? { ok: true, message: 'Amazon.fr accessible (scraping — peut casser à tout moment).' }
        : { ok: false, message: `Amazon a répondu HTTP ${res.status} (probablement bloqué).` };
    } catch (err) {
      return { ok: false, message: `Erreur scraping Amazon : ${(err as Error).message}` };
    }
  },
};

export default amazonScrapingFallback;
