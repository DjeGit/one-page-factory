/**
 * Keepa — historique prix + Best Seller Rank par marketplace Amazon.
 * https://keepa.com/api-docs/  (~19€/mois, 1 token/min sur le plan de base)
 *
 * Domain IDs Keepa (vérifiés dans la doc officielle) : amazon.com=1,
 * amazon.co.uk=2, amazon.fr=4, amazon.es=9.
 *
 * TODO (à faire une fois le compte Keepa actif) : renseigner les vrais
 * category node IDs Amazon par marché dans CATEGORY_NODES ci-dessous
 * (trouvables via https://api.keepa.com/category ou l'explorateur Keepa) —
 * ceux du dessous sont des exemples génériques "Electronics" à remplacer
 * par les catégories réellement pertinentes pour OPF.
 */
import type { Market } from '@/lib/market';
import type { DataSourceClient, RawProductSignal, ConnectionTestResult } from '@/lib/integrations/types';

const KEEPA_DOMAIN: Record<Market, number> = { fr: 4, es: 9, uk: 2 };

// Exemple : nœud "Electronics" par marketplace — À REMPLACER par les
// catégories pertinentes pour le catalogue OPF avant activation réelle.
const CATEGORY_NODES: Record<Market, number> = { fr: 172541, es: 599372031, uk: 560800 };

function apiKey(): string | undefined {
  return process.env.KEEPA_API_KEY;
}

async function fetchBestsellerAsins(market: Market, category?: string): Promise<string[]> {
  const domain = KEEPA_DOMAIN[market];
  const node = category ? Number(category) : CATEGORY_NODES[market];
  const url = `https://api.keepa.com/bestsellers?key=${apiKey()}&domain=${domain}&category=${node}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Keepa bestsellers HTTP ${res.status}`);
  const data = await res.json();
  const asinList: string[] = data?.bestSellersList?.asinList ?? [];
  return asinList.slice(0, 30);
}

async function fetchProductDetails(market: Market, asins: string[]): Promise<any[]> {
  if (asins.length === 0) return [];
  const domain = KEEPA_DOMAIN[market];
  const url = `https://api.keepa.com/product?key=${apiKey()}&domain=${domain}&asin=${asins.join(',')}&stats=180`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Keepa product HTTP ${res.status}`);
  const data = await res.json();
  return data?.products ?? [];
}

function centsToUnit(cents: number | undefined | null): number | null {
  if (cents === undefined || cents === null || cents < 0) return null;
  return Math.round(cents) / 100;
}

const keepaClient: DataSourceClient = {
  id: 'keepa',
  displayName: 'Keepa',

  isConfigured(): boolean {
    return Boolean(apiKey());
  },

  async fetchTrendingProducts(market, category): Promise<RawProductSignal[]> {
    const asins = await fetchBestsellerAsins(market, category);
    const products = await fetchProductDetails(market, asins);

    return products.map((p): RawProductSignal => {
      const currentPriceCents = p?.stats?.current?.[0]; // index 0 = Amazon price (New)
      const rating = p?.stats?.current?.[16] ? p.stats.current[16] / 10 : null; // rating x10 si présent
      return {
        source: 'keepa',
        market,
        name: p.title || 'Produit sans nom',
        image: p.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${p.imagesCSV.split(',')[0]}` : undefined,
        price: centsToUnit(currentPriceCents),
        currency: market === 'uk' ? 'GBP' : 'EUR',
        rating,
        bsr: p?.salesRanks ? (Object.values(p.salesRanks as Record<string, number[]>)?.[0]?.[0] ?? null) : null,
        url: `https://www.amazon.${market === 'uk' ? 'co.uk' : market}/dp/${p.asin}`,
        raw: p,
      };
    });
  },

  async testConnection(): Promise<ConnectionTestResult> {
    if (!apiKey()) return { ok: false, message: 'KEEPA_API_KEY absente des variables d\'environnement.' };
    try {
      const res = await fetch(`https://api.keepa.com/token?key=${apiKey()}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return { ok: false, message: `Keepa a répondu HTTP ${res.status}.` };
      const data = await res.json();
      return { ok: true, message: `Connecté — ${data.tokensLeft ?? '?'} tokens restants.` };
    } catch (err) {
      return { ok: false, message: `Erreur de connexion Keepa : ${(err as Error).message}` };
    }
  },
};

export default keepaClient;
