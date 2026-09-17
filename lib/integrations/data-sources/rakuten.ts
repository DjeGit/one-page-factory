/**
 * Rakuten Advertising — fort en France et Espagne, gratuit.
 * Product Search API (LinkSynergy héritage) — https://developers.rakutenadvertising.com/
 * TODO une fois le compte actif : vérifier si le compte utilise l'API
 * héritée (api.linksynergy.com, token Bearer) ou la nouvelle plateforme
 * GraphQL Rakuten Advertising — la doc a changé plusieurs fois ces
 * dernières années, à reconfirmer à l'activation.
 */
import type { Market } from '@/lib/market';
import type { DataSourceClient, RawProductSignal, ConnectionTestResult } from '@/lib/integrations/types';

function token(): string | undefined {
  return process.env.RAKUTEN_API_TOKEN;
}

const MID_BY_MARKET: Record<Market, string | undefined> = {
  fr: process.env.RAKUTEN_MERCHANT_ID_FR,
  es: process.env.RAKUTEN_MERCHANT_ID_ES,
  uk: process.env.RAKUTEN_MERCHANT_ID_UK,
};

const rakutenClient: DataSourceClient = {
  id: 'rakuten',
  displayName: 'Rakuten Advertising',

  isConfigured(): boolean {
    return Boolean(token());
  },

  async fetchTrendingProducts(market, category): Promise<RawProductSignal[]> {
    const t = token();
    if (!t) throw new Error('Rakuten non configuré (RAKUTEN_API_TOKEN manquant).');
    const mid = MID_BY_MARKET[market];

    const params = new URLSearchParams({
      keyword: category || 'tendance',
      max: '30',
      ...(mid ? { mid } : {}),
    });
    const res = await fetch(`https://api.linksynergy.com/productsearch/1.0?${params}`, {
      headers: { Authorization: `Bearer ${t}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Rakuten HTTP ${res.status}`);
    const data = await res.json();
    const items = data?.item ?? data?.items ?? [];

    return items.map((it: any): RawProductSignal => ({
      source: 'rakuten',
      market,
      name: it.productname || it.name || 'Produit sans nom',
      price: it.price ? parseFloat(it.price) : null,
      currency: market === 'uk' ? 'GBP' : 'EUR',
      image: it.imageurl,
      url: it.linkurl || it.link,
      raw: it,
    }));
  },

  async testConnection(): Promise<ConnectionTestResult> {
    if (!token()) return { ok: false, message: 'RAKUTEN_API_TOKEN absent des variables d\'environnement.' };
    try {
      const res = await fetch('https://api.linksynergy.com/productsearch/1.0?max=1&keyword=test', {
        headers: { Authorization: `Bearer ${token()}` },
        signal: AbortSignal.timeout(10000),
      });
      return res.ok
        ? { ok: true, message: 'Token Rakuten valide.' }
        : { ok: false, message: `Rakuten a répondu HTTP ${res.status} — vérifier si le compte utilise encore l'API héritée.` };
    } catch (err) {
      return { ok: false, message: `Erreur de connexion Rakuten : ${(err as Error).message}` };
    }
  },
};

export default rakutenClient;
