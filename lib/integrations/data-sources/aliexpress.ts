/**
 * AliExpress Affiliate API — gratuit avec compte affilié AliExpress.
 * https://developers.aliexpress.com/  (TOP API, signature MD5)
 * Utile pour repérer des produits AVANT qu'ils arrivent sur Amazon.
 *
 * TODO à l'activation : la signature exacte (ordre des paramètres avant
 * hash) doit être vérifiée sur la doc officielle au moment de la mise en
 * service — c'est le point le plus fragile de cette intégration.
 */
import { createHash } from 'crypto';
import type { Market } from '@/lib/market';
import type { DataSourceClient, RawProductSignal, ConnectionTestResult } from '@/lib/integrations/types';

const TARGET_CURRENCY: Record<Market, string> = { fr: 'EUR', es: 'EUR', uk: 'GBP' };
const TARGET_LANGUAGE: Record<Market, string> = { fr: 'FR', es: 'ES', uk: 'EN' };
const SHIP_TO_COUNTRY: Record<Market, string> = { fr: 'FR', es: 'ES', uk: 'GB' };

function appKey(): string | undefined {
  return process.env.ALIEXPRESS_APP_KEY;
}
function appSecret(): string | undefined {
  return process.env.ALIEXPRESS_APP_SECRET;
}
function trackingId(): string | undefined {
  return process.env.ALIEXPRESS_TRACKING_ID;
}

function sign(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params).sort();
  const base = sorted.map((k) => `${k}${params[k]}`).join('');
  return createHash('md5').update(secret + base + secret).digest('hex').toUpperCase();
}

async function callApi(method: string, extra: Record<string, string>): Promise<any> {
  const key = appKey();
  const secret = appSecret();
  if (!key || !secret) throw new Error('AliExpress non configuré.');

  const params: Record<string, string> = {
    app_key: key,
    method,
    sign_method: 'md5',
    timestamp: String(Date.now()),
    v: '2.0',
    format: 'json',
    ...extra,
  };
  params.sign = sign(params, secret);

  const res = await fetch('https://api-sg.aliexpress.com/sync?' + new URLSearchParams(params), {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`AliExpress HTTP ${res.status}`);
  return res.json();
}

const aliexpressClient: DataSourceClient = {
  id: 'aliexpress',
  displayName: 'AliExpress Affiliate',

  isConfigured(): boolean {
    return Boolean(appKey() && appSecret() && trackingId());
  },

  async fetchTrendingProducts(market, category): Promise<RawProductSignal[]> {
    const data = await callApi('aliexpress.affiliate.hotproduct.query', {
      tracking_id: trackingId()!,
      target_currency: TARGET_CURRENCY[market],
      target_language: TARGET_LANGUAGE[market],
      ship_to_country: SHIP_TO_COUNTRY[market],
      page_size: '30',
      ...(category ? { keywords: category } : {}),
    });
    const products = data?.aliexpress_affiliate_hotproduct_query_response?.resp_result?.result?.products?.product ?? [];

    return products.map((p: any): RawProductSignal => ({
      source: 'aliexpress',
      market,
      name: p.product_title || 'Produit sans nom',
      price: p.target_sale_price ? parseFloat(p.target_sale_price) : null,
      currency: TARGET_CURRENCY[market],
      rating: p.evaluate_rate ? parseFloat(p.evaluate_rate) / 20 : null, // % -> /5
      image: p.product_main_image_url,
      url: p.promotion_link || p.product_detail_url,
      commissionRate: p.commission_rate ? parseFloat(p.commission_rate) / 100 : null,
      raw: p,
    }));
  },

  async testConnection(): Promise<ConnectionTestResult> {
    if (!appKey() || !appSecret() || !trackingId()) {
      return { ok: false, message: 'ALIEXPRESS_APP_KEY / APP_SECRET / TRACKING_ID absents.' };
    }
    try {
      await callApi('aliexpress.affiliate.hotproduct.query', {
        tracking_id: trackingId()!,
        target_currency: 'EUR',
        target_language: 'FR',
        ship_to_country: 'FR',
        page_size: '1',
      });
      return { ok: true, message: 'Connexion AliExpress OK.' };
    } catch (err) {
      return { ok: false, message: `Erreur AliExpress : ${(err as Error).message}` };
    }
  },
};

export default aliexpressClient;
