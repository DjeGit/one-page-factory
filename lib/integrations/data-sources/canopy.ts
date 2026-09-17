/**
 * Canopy API — données Amazon sans compte vendeur, GraphQL. Payant,
 * optionnel. Fort sur amazon.com, couverture .fr/.es limitée vs Keepa —
 * à garder en complément, pas en source primaire pour OPF (cf. rapport de
 * juillet : "Keepa + DataForSEO couvrent les mêmes données moins cher").
 * https://www.canopyapi.co/
 */
import type { Market } from '@/lib/market';
import type { DataSourceClient, RawProductSignal, ConnectionTestResult } from '@/lib/integrations/types';

const DOMAIN: Record<Market, string> = { fr: 'amazon.fr', es: 'amazon.es', uk: 'amazon.co.uk' };

function apiKey(): string | undefined {
  return process.env.CANOPY_API_KEY;
}

async function graphql(query: string, variables: Record<string, unknown>): Promise<any> {
  const key = apiKey();
  if (!key) throw new Error('Canopy API non configurée.');
  const res = await fetch('https://graphql.canopyapi.co/graphql', {
    method: 'POST',
    headers: { 'API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Canopy HTTP ${res.status}`);
  return res.json();
}

const SEARCH_QUERY = `
  query SearchProducts($domain: AmazonDomain!, $query: String!) {
    amazonProductSearchResults(input: { domain: $domain, query: $query }) {
      productResults {
        results { title price { display } rating ratingsTotal mainImageUrl asin }
      }
    }
  }
`;

const canopyClient: DataSourceClient = {
  id: 'canopy',
  displayName: 'Canopy API',

  isConfigured(): boolean {
    return Boolean(apiKey());
  },

  async fetchTrendingProducts(market, category): Promise<RawProductSignal[]> {
    const data = await graphql(SEARCH_QUERY, { domain: DOMAIN[market].split('.')[1].toUpperCase(), query: category || 'trending' });
    const results = data?.data?.amazonProductSearchResults?.productResults?.results ?? [];

    return results.slice(0, 30).map((r: any): RawProductSignal => ({
      source: 'canopy',
      market,
      name: r.title || 'Produit sans nom',
      price: r.price?.display ? parseFloat(String(r.price.display).replace(/[^0-9.,]/g, '').replace(',', '.')) : null,
      currency: market === 'uk' ? 'GBP' : 'EUR',
      rating: r.rating ?? null,
      reviewCount: r.ratingsTotal ?? undefined,
      image: r.mainImageUrl,
      url: r.asin ? `https://${DOMAIN[market]}/dp/${r.asin}` : '',
      raw: r,
    }));
  },

  async testConnection(): Promise<ConnectionTestResult> {
    if (!apiKey()) return { ok: false, message: 'CANOPY_API_KEY absente.' };
    try {
      await graphql(SEARCH_QUERY, { domain: 'FR', query: 'test' });
      return { ok: true, message: 'Connexion Canopy OK.' };
    } catch (err) {
      return { ok: false, message: `Erreur Canopy : ${(err as Error).message}` };
    }
  },
};

export default canopyClient;
