/**
 * CJ Affiliate (Commission Junction) — fort US/UK, présence FR/ES, gratuit.
 * Product Search API — https://developers.cj.com/docs/rest-apis/product-search
 */
import type { Market } from '@/lib/market';
import type { DataSourceClient, RawProductSignal, ConnectionTestResult } from '@/lib/integrations/types';

function token(): string | undefined {
  return process.env.CJ_API_TOKEN;
}
function websiteId(): string | undefined {
  return process.env.CJ_WEBSITE_ID;
}

const cjClient: DataSourceClient = {
  id: 'cj-affiliate',
  displayName: 'CJ Affiliate',

  isConfigured(): boolean {
    return Boolean(token() && websiteId());
  },

  async fetchTrendingProducts(market, category): Promise<RawProductSignal[]> {
    if (!token() || !websiteId()) throw new Error('CJ Affiliate non configuré.');
    const params = new URLSearchParams({
      'website-id': websiteId()!,
      keywords: category || 'trending',
      'records-per-page': '30',
    });
    const res = await fetch(`https://product-search.api.cj.com/v2/product-search?${params}`, {
      headers: { Authorization: `Bearer ${token()}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`CJ Affiliate HTTP ${res.status}`);
    const data = await res.json();
    const products = data?.products?.product ?? [];

    return products.map((p: any): RawProductSignal => ({
      source: 'cj-affiliate',
      market,
      name: p.name || 'Produit sans nom',
      price: p.price?.value ? parseFloat(p.price.value) : null,
      currency: p.price?.currency || (market === 'uk' ? 'GBP' : 'EUR'),
      image: p.imageUrl,
      url: p.buyUrl,
      raw: p,
    }));
  },

  async testConnection(): Promise<ConnectionTestResult> {
    if (!token() || !websiteId()) return { ok: false, message: 'CJ_API_TOKEN / CJ_WEBSITE_ID absents.' };
    try {
      const res = await fetch(`https://product-search.api.cj.com/v2/product-search?website-id=${websiteId()}&records-per-page=1&keywords=test`, {
        headers: { Authorization: `Bearer ${token()}` },
        signal: AbortSignal.timeout(10000),
      });
      return res.ok ? { ok: true, message: 'Connexion CJ Affiliate OK.' } : { ok: false, message: `CJ a répondu HTTP ${res.status}.` };
    } catch (err) {
      return { ok: false, message: `Erreur de connexion CJ : ${(err as Error).message}` };
    }
  },
};

export default cjClient;
