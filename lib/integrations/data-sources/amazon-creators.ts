/**
 * Amazon Creators API — remplace PA-API 5 (retiré 15 mai 2026).
 * https://affiliate-program.amazon.fr/creatorsapi/docs/
 * Gratuite, incluse avec un compte Amazon Associates actif — mais
 * nécessite 10 ventes affiliées qualifiées sur les 30 derniers jours pour
 * générer des identifiants (Credential ID / Credential Secret, remplacent
 * les anciennes clés AWS access/secret key de PA-API).
 *
 * OAuth2 client_credentials — le token (valide 1h) est mis en cache en
 * mémoire process ; suffisant pour un cron 6h, pas besoin de le persister.
 */
import type { Market } from '@/lib/market';
import type { DataSourceClient, RawProductSignal, ConnectionTestResult } from '@/lib/integrations/types';

const MARKETPLACE: Record<Market, string> = {
  fr: 'www.amazon.fr',
  es: 'www.amazon.es',
  uk: 'www.amazon.co.uk',
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function credentials() {
  const id = process.env.AMAZON_CREATORS_CREDENTIAL_ID;
  const secret = process.env.AMAZON_CREATORS_CREDENTIAL_SECRET;
  const partnerTag = process.env.AMAZON_AFFILIATE_TAG;
  if (!id || !secret || !partnerTag) return null;
  return { id, secret, partnerTag };
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const creds = credentials();
  if (!creds) throw new Error('Amazon Creators API non configurée.');

  const res = await fetch('https://creatorsapi.amazon/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'creatorsapi::default',
      client_id: creds.id,
      client_secret: creds.secret,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Amazon Creators auth HTTP ${res.status}`);
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

const amazonCreatorsClient: DataSourceClient = {
  id: 'amazon-creators',
  displayName: 'Amazon Creators API',

  isConfigured(): boolean {
    return Boolean(credentials());
  },

  async fetchTrendingProducts(market, category): Promise<RawProductSignal[]> {
    const creds = credentials();
    if (!creds) throw new Error('Amazon Creators API non configurée.');
    const token = await getAccessToken();
    const marketplace = MARKETPLACE[market];

    const res = await fetch('https://creatorsapi.amazon/catalog/v1/searchItems', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-marketplace': marketplace,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords: category || 'best sellers',
        partnerTag: creds.partnerTag,
        marketplace,
        resources: ['images.primary.large', 'itemInfo.title', 'offers.listings.price', 'customerReviews'],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Amazon Creators searchItems HTTP ${res.status}`);
    const data = await res.json();

    return (data?.items ?? []).map((item: any): RawProductSignal => ({
      source: 'amazon-creators',
      market,
      name: item?.itemInfo?.title?.displayValue || 'Produit sans nom',
      price: item?.offers?.listings?.[0]?.price?.amount ?? null,
      currency: item?.offers?.listings?.[0]?.price?.currency ?? (market === 'uk' ? 'GBP' : 'EUR'),
      rating: item?.customerReviews?.starRating?.value ?? null,
      reviewCount: item?.customerReviews?.count ?? undefined,
      image: item?.images?.primary?.large?.url,
      url: item?.detailPageUrl,
      raw: item,
    }));
  },

  async testConnection(): Promise<ConnectionTestResult> {
    if (!credentials()) {
      return {
        ok: false,
        message: 'Identifiants absents (AMAZON_CREATORS_CREDENTIAL_ID/SECRET/AMAZON_AFFILIATE_TAG). Nécessite 10 ventes affiliées qualifiées sur 30 jours pour être généré.',
      };
    }
    try {
      await getAccessToken();
      return { ok: true, message: 'Authentification OAuth2 réussie.' };
    } catch (err) {
      return { ok: false, message: `Erreur Amazon Creators API : ${(err as Error).message}` };
    }
  },
};

export default amazonCreatorsClient;
