/**
 * Jungle Scout API — recherche Amazon avancée. Payant, optionnel Phase 2.
 * https://developer.junglescout.com/api/
 * Auth : header "Authorization: {key_name}:{api_key}" (format spécifique
 * Jungle Scout, à reconfirmer à l'activation).
 */
import type { Market } from '@/lib/market';
import type { DataSourceClient, RawProductSignal, ConnectionTestResult } from '@/lib/integrations/types';

const MARKETPLACE: Record<Market, string> = { fr: 'fr', es: 'es', uk: 'uk' };

function authHeader(): string | undefined {
  const keyName = process.env.JUNGLESCOUT_KEY_NAME;
  const apiKey = process.env.JUNGLESCOUT_API_KEY;
  if (!keyName || !apiKey) return undefined;
  return `${keyName}:${apiKey}`;
}

const jungleScoutClient: DataSourceClient = {
  id: 'jungle-scout',
  displayName: 'Jungle Scout',

  isConfigured(): boolean {
    return Boolean(authHeader());
  },

  async fetchTrendingProducts(market, category): Promise<RawProductSignal[]> {
    const auth = authHeader();
    if (!auth) throw new Error('Jungle Scout non configuré.');
    const res = await fetch(
      `https://developer.junglescout.com/api/product_database_query/v1?marketplace=${MARKETPLACE[market]}${category ? `&search_terms=${encodeURIComponent(category)}` : ''}`,
      { headers: { Authorization: auth, Accept: 'application/vnd.api+json' }, signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) throw new Error(`Jungle Scout HTTP ${res.status}`);
    const data = await res.json();
    const items = data?.data ?? [];

    return items.slice(0, 30).map((it: any): RawProductSignal => ({
      source: 'jungle-scout',
      market,
      name: it.attributes?.title || 'Produit sans nom',
      price: it.attributes?.price ?? null,
      currency: market === 'uk' ? 'GBP' : 'EUR',
      rating: it.attributes?.rating ?? null,
      reviewCount: it.attributes?.review_count ?? undefined,
      bsr: it.attributes?.rank ?? null,
      url: '', // pas d'URL produit directe dans cet endpoint Jungle Scout
      raw: it,
    }));
  },

  async testConnection(): Promise<ConnectionTestResult> {
    if (!authHeader()) return { ok: false, message: 'JUNGLESCOUT_KEY_NAME / JUNGLESCOUT_API_KEY absents.' };
    try {
      const res = await fetch('https://developer.junglescout.com/api/product_database_query/v1?marketplace=fr', {
        headers: { Authorization: authHeader()!, Accept: 'application/vnd.api+json' },
        signal: AbortSignal.timeout(10000),
      });
      return res.ok ? { ok: true, message: 'Connexion Jungle Scout OK.' } : { ok: false, message: `Jungle Scout a répondu HTTP ${res.status}.` };
    } catch (err) {
      return { ok: false, message: `Erreur Jungle Scout : ${(err as Error).message}` };
    }
  },
};

export default jungleScoutClient;
