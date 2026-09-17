/**
 * Google Trends — gratuit. Pas d'API officielle : utilise l'endpoint
 * public non documenté de trends.google.com (peut casser sans préavis),
 * ou SerpApi si l'intégration 'serpapi' est elle aussi activée (plus
 * stable, payant). Sert surtout à VALIDER qu'un produit tendance sur un
 * marché l'est aussi sur un autre avant de l'ajouter (cf. rapport de
 * juillet) — un signal de confirmation, pas une source de découverte
 * primaire.
 */
import type { Market } from '@/lib/market';
import type { DataSourceClient, RawProductSignal, ConnectionTestResult } from '@/lib/integrations/types';

const GEO: Record<Market, string> = { fr: 'FR', es: 'ES', uk: 'GB' };

async function viaSerpApi(market: Market, keyword: string): Promise<RawProductSignal[]> {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return [];
  const params = new URLSearchParams({
    engine: 'google_trends',
    q: keyword,
    geo: GEO[market],
    api_key: key,
  });
  const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];
  const data = await res.json();
  const points = data?.interest_over_time?.timeline_data ?? [];
  const latest = points[points.length - 1];
  if (!latest) return [];
  return [{
    source: 'google-trends',
    market,
    name: keyword,
    url: `https://trends.google.com/trends/explore?geo=${GEO[market]}&q=${encodeURIComponent(keyword)}`,
    raw: latest,
  }];
}

async function viaUnofficialEndpoint(market: Market): Promise<RawProductSignal[]> {
  // Best-effort — endpoint non documenté officiellement, peut casser.
  const url = `https://trends.google.com/trends/api/dailytrends?hl=${market === 'uk' ? 'en-GB' : market}&geo=${GEO[market]}&ns=15`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return [];
  const text = await res.text();
  // La réponse commence par ")]}'," à retirer avant parse JSON.
  const json = JSON.parse(text.replace(")]}',", ''));
  const days = json?.default?.trendingSearchesDays ?? [];
  const searches = days[0]?.trendingSearches ?? [];
  return searches.slice(0, 20).map((s: any): RawProductSignal => ({
    source: 'google-trends',
    market,
    name: s?.title?.query || 'Tendance',
    url: `https://trends.google.com/trends/explore?geo=${GEO[market]}&q=${encodeURIComponent(s?.title?.query || '')}`,
    raw: s,
  }));
}

const googleTrendsClient: DataSourceClient = {
  id: 'google-trends',
  displayName: 'Google Trends',

  isConfigured(): boolean {
    return true; // gratuit, pas de clé requise (SerpApi en option si dispo)
  },

  async fetchTrendingProducts(market, category): Promise<RawProductSignal[]> {
    if (category && process.env.SERPAPI_API_KEY) {
      return viaSerpApi(market, category);
    }
    return viaUnofficialEndpoint(market);
  },

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const results = await viaUnofficialEndpoint('fr');
      return results.length > 0
        ? { ok: true, message: `OK — ${results.length} tendances récupérées (endpoint non officiel).` }
        : { ok: false, message: 'Endpoint Google Trends non officiel injoignable ou format changé.' };
    } catch (err) {
      return { ok: false, message: `Erreur Google Trends : ${(err as Error).message}` };
    }
  },
};

export default googleTrendsClient;
