/**
 * SerpAPI — scraping SERP/Google Shopping par pays. Payant, optionnel.
 * https://serpapi.com/google-shopping-api
 */
import type { Market } from '@/lib/market';
import type { DataSourceClient, RawProductSignal, ConnectionTestResult } from '@/lib/integrations/types';

const GL: Record<Market, string> = { fr: 'fr', es: 'es', uk: 'uk' };
const HL: Record<Market, string> = { fr: 'fr', es: 'es', uk: 'en' };

function apiKey(): string | undefined {
  return process.env.SERPAPI_API_KEY;
}

const DEFAULT_QUERY: Record<Market, string> = {
  fr: 'produit tendance',
  es: 'producto tendencia',
  uk: 'trending product',
};

const serpApiClient: DataSourceClient = {
  id: 'serpapi',
  displayName: 'SerpAPI (Google Shopping)',

  isConfigured(): boolean {
    return Boolean(apiKey());
  },

  async fetchTrendingProducts(market, category): Promise<RawProductSignal[]> {
    const key = apiKey();
    if (!key) throw new Error('SerpAPI non configuré (SERPAPI_API_KEY manquant).');
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: category || DEFAULT_QUERY[market],
      gl: GL[market],
      hl: HL[market],
      api_key: key,
    });
    const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`SerpAPI HTTP ${res.status}`);
    const data = await res.json();
    const results = data?.shopping_results ?? [];

    return results.slice(0, 30).map((r: any): RawProductSignal => ({
      source: 'serpapi',
      market,
      name: r.title || 'Produit sans nom',
      price: typeof r.extracted_price === 'number' ? r.extracted_price : null,
      currency: market === 'uk' ? 'GBP' : 'EUR',
      rating: r.rating ?? null,
      reviewCount: r.reviews ?? undefined,
      image: r.thumbnail,
      url: r.product_link || r.link,
      raw: r,
    }));
  },

  async testConnection(): Promise<ConnectionTestResult> {
    if (!apiKey()) return { ok: false, message: 'SERPAPI_API_KEY absente.' };
    try {
      const res = await fetch(`https://serpapi.com/account.json?api_key=${apiKey()}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return { ok: false, message: `SerpAPI a répondu HTTP ${res.status}.` };
      const data = await res.json();
      return { ok: true, message: `Connecté — ${data.plan_searches_left ?? '?'} recherches restantes.` };
    } catch (err) {
      return { ok: false, message: `Erreur SerpAPI : ${(err as Error).message}` };
    }
  },
};

export default serpApiClient;
