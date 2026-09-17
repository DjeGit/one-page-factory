/**
 * DataForSEO — Google Shopping / tendances par pays.
 * https://docs.dataforseo.com/v3/merchant-google-overview/
 * (~25€/mois selon volume, pay-as-you-go, endpoint MCP dispo séparément)
 *
 * Auth : HTTP Basic (login:password DataForSEO, PAS une clé API unique) —
 * DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD dans l'env.
 *
 * location_code : identifiants standards Google Ads geotargeting —
 * France=2250, Espagne=2724, Royaume-Uni=2826 (à revérifier via
 * GET /v3/merchant/google/locations avant mise en prod si Google change
 * ces IDs).
 */
import type { Market } from '@/lib/market';
import type { DataSourceClient, RawProductSignal, ConnectionTestResult } from '@/lib/integrations/types';

const LOCATION_CODE: Record<Market, number> = { fr: 2250, es: 2724, uk: 2826 };
const LANGUAGE_CODE: Record<Market, string> = { fr: 'fr', es: 'es', uk: 'en' };

function authHeader(): string | undefined {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return undefined;
  return 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');
}

const DEFAULT_KEYWORDS: Record<Market, string[]> = {
  fr: ['produit tendance maison', 'gadget populaire'],
  es: ['producto tendencia hogar', 'gadget popular'],
  uk: ['trending home gadget', 'popular gadget'],
};

const dataForSeoClient: DataSourceClient = {
  id: 'dataforseo',
  displayName: 'DataForSEO (Google Shopping)',

  isConfigured(): boolean {
    return Boolean(authHeader());
  },

  async fetchTrendingProducts(market, category): Promise<RawProductSignal[]> {
    const auth = authHeader();
    if (!auth) throw new Error('DataForSEO non configuré (DATAFORSEO_LOGIN/PASSWORD manquants).');

    const keywords = category ? [category] : DEFAULT_KEYWORDS[market];
    const body = keywords.map((keyword) => ({
      keyword,
      location_code: LOCATION_CODE[market],
      language_code: LANGUAGE_CODE[market],
    }));

    // Endpoint "live" (synchrone) plutôt que task_post/task_get (async) —
    // plus simple à intégrer pour un refresh périodique, coût légèrement
    // supérieur mais négligeable au volume d'un refresh 6h/marché.
    const res = await fetch('https://api.dataforseo.com/v3/merchant/google/products/live/advanced', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`DataForSEO HTTP ${res.status}`);
    const data = await res.json();

    const signals: RawProductSignal[] = [];
    for (const task of data?.tasks ?? []) {
      for (const result of task?.result ?? []) {
        for (const item of result?.items ?? []) {
          signals.push({
            source: 'dataforseo',
            market,
            name: item.title || 'Produit sans nom',
            price: typeof item.price?.current === 'number' ? item.price.current : null,
            currency: item.price?.currency || (market === 'uk' ? 'GBP' : 'EUR'),
            rating: item.rating?.value ?? null,
            reviewCount: item.rating?.votes_count ?? undefined,
            image: item.thumbnail,
            url: item.url || item.direct_link || '',
            raw: item,
          });
        }
      }
    }
    return signals;
  },

  async testConnection(): Promise<ConnectionTestResult> {
    const auth = authHeader();
    if (!auth) return { ok: false, message: 'DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD absents des variables d\'environnement.' };
    try {
      const res = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
        headers: { Authorization: auth },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { ok: false, message: `DataForSEO a répondu HTTP ${res.status}.` };
      const data = await res.json();
      const balance = data?.tasks?.[0]?.result?.[0]?.money?.balance;
      return { ok: true, message: `Connecté — solde ${balance ?? '?'}.` };
    } catch (err) {
      return { ok: false, message: `Erreur de connexion DataForSEO : ${(err as Error).message}` };
    }
  },
};

export default dataForSeoClient;
