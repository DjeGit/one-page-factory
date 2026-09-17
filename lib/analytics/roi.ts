/**
 * lib/analytics/roi.ts (Sprint 5)
 *
 * Isole le calcul coût vs gain — remplace l'estimation forfaitaire figée
 * (2% de conversion x 30% de commission, identique pour tout produit et
 * tout marché) qui vivait directement dans getAnalytics() (lib/supabase.ts).
 *
 * Reste une ESTIMATION tant qu'aucune conversion réelle ne remonte —
 * pixel_meta/pixel_tiktok sont posés côté page produit mais ne renvoient
 * aujourd'hui aucune donnée de conversion exploitable côté serveur.
 * `actualConversionRate` permet de brancher un taux réel plus tard sans
 * changer la signature de computeProductROI.
 */
import type { Market } from '@/lib/market';
import { getCurrencyForMarket } from '@/lib/market';
import { getSupabaseAdmin } from '@/lib/supabase';

export const DEFAULT_CONVERSION_RATE = 0.02; // 2% — hypothèse de départ, à remplacer dès que possible
export const DEFAULT_COMMISSION_RATE = 0.3; // 30% — fallback si products.commission_rate n'est pas renseigné

export type ProductSource = 'auto_discovered' | 'manual_affiliate' | 'own_product' | null | undefined;

export interface ProductROIInput {
  price: number | null;
  costPrice: number | null;
  adSpendAllocated: number | null;
  commissionRate: number | null; // fraction 0-1
  productSource: ProductSource;
  clicks: number;
  currency: 'EUR' | 'GBP';
  /** Unités de `currency` pour 1 EUR (ex. 0.86 GBP = 1 EUR). null = taux indisponible. Ignoré si currency === 'EUR'. */
  eurRate: number | null;
  actualConversionRate?: number | null;
}

export interface ProductROIResult {
  currency: 'EUR' | 'GBP';
  conversionRateUsed: number;
  isEstimate: boolean;
  estimatedConversions: number;
  revenue: number; // devise native du marché
  cost: number; // devise native
  margin: number; // devise native
  revenueEur: number | null;
  costEur: number | null;
  marginEur: number | null;
  roiPercent: number | null; // (margin / cost) * 100 — null si cost = 0 (ROI non défini)
  conversionAvailable: boolean; // false si currency !== 'EUR' et aucun taux de change connu
}

/**
 * Calcule revenu/coût/marge/ROI pour UN produit. Fonction pure (aucun
 * accès DB) pour rester facilement testable — computeMarketROI ci-dessous
 * fait le travail d'agrégation + accès Supabase.
 *
 * Modèle de revenu selon la provenance du produit :
 *   - 'own_product' (vendu en propre) : le prix affiché est encaissé en
 *     totalité — revenu = conversions × prix, coût = conversions ×
 *     cost_price + ad_spend_allocated.
 *   - sinon (affiliation, auto-découverte ou lien ajouté à la main) :
 *     seule la commission est perçue — revenu = conversions × prix ×
 *     commission_rate. cost_price reste disponible pour un coût
 *     d'acquisition éventuel (ex. frais de création de contenu), 0 par
 *     défaut.
 */
export function computeProductROI(input: ProductROIInput): ProductROIResult {
  const conversionRate = input.actualConversionRate ?? DEFAULT_CONVERSION_RATE;
  const isEstimate = input.actualConversionRate == null;
  const estimatedConversions = input.clicks * conversionRate;

  const price = input.price ?? 0;
  const costPrice = input.costPrice ?? 0;
  const adSpend = input.adSpendAllocated ?? 0;

  let revenue: number;
  if (input.productSource === 'own_product') {
    revenue = estimatedConversions * price;
  } else {
    const commissionRate = input.commissionRate ?? DEFAULT_COMMISSION_RATE;
    revenue = estimatedConversions * price * commissionRate;
  }
  const cost = estimatedConversions * costPrice + adSpend;
  const margin = revenue - cost;
  const roiPercent = cost > 0 ? (margin / cost) * 100 : null;

  const conversionAvailable = input.currency === 'EUR' || input.eurRate != null;
  const toEur = (amount: number): number | null => {
    if (input.currency === 'EUR') return amount;
    if (input.eurRate == null) return null;
    return amount / input.eurRate;
  };

  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    currency: input.currency,
    conversionRateUsed: conversionRate,
    isEstimate,
    estimatedConversions: round2(estimatedConversions),
    revenue: round2(revenue),
    cost: round2(cost),
    margin: round2(margin),
    revenueEur: toEur(revenue) != null ? round2(toEur(revenue) as number) : null,
    costEur: toEur(cost) != null ? round2(toEur(cost) as number) : null,
    marginEur: toEur(margin) != null ? round2(toEur(margin) as number) : null,
    roiPercent: roiPercent != null ? Math.round(roiPercent * 10) / 10 : null,
    conversionAvailable,
  };
}

/**
 * Dernier taux de change connu EUR → currency (unités de `currency` pour
 * 1 EUR), alimenté par app/api/cron/exchange-rates. null si jamais
 * renseigné pour cette devise (le cron n'a pas encore tourné).
 */
export async function getLatestExchangeRate(currency: 'EUR' | 'GBP'): Promise<number | null> {
  if (currency === 'EUR') return 1;
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from('exchange_rates')
    .select('rate')
    .eq('base_currency', 'EUR')
    .eq('target_currency', currency)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.rate != null ? Number(data.rate) : null;
}

export interface MarketROISummary {
  market: Market;
  currency: 'EUR' | 'GBP';
  eurRate: number | null;
  totalRevenueEur: number | null;
  totalCostEur: number | null;
  totalMarginEur: number | null;
  products: (ProductROIResult & { productId: string; productName: string })[];
}

/** Agrège le coût/gain de tous les produits d'un marché — consommé par le dashboard et Analytics. */
export async function computeMarketROI(market: Market): Promise<MarketROISummary> {
  const currency = getCurrencyForMarket(market);
  const sb = getSupabaseAdmin();

  const [{ data: products }, eurRate] = await Promise.all([
    sb
      .from('products')
      .select('id, name, price, cost_price, ad_spend_allocated, commission_rate, product_source')
      .eq('market', market),
    getLatestExchangeRate(currency),
  ]);

  const results: (ProductROIResult & { productId: string; productName: string })[] = [];

  for (const p of products || []) {
    const { count: clickCount } = await sb
      .from('clicks')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', p.id);

    const roi = computeProductROI({
      price: p.price,
      costPrice: p.cost_price,
      adSpendAllocated: p.ad_spend_allocated,
      commissionRate: p.commission_rate,
      productSource: p.product_source,
      clicks: clickCount || 0,
      currency,
      eurRate,
    });

    results.push({ ...roi, productId: p.id, productName: p.name });
  }

  const sumEur = (key: 'revenueEur' | 'costEur' | 'marginEur'): number | null =>
    results.some((r) => r[key] == null) ? null : results.reduce((acc, r) => acc + (r[key] as number), 0);

  return {
    market,
    currency,
    eurRate,
    totalRevenueEur: sumEur('revenueEur'),
    totalCostEur: sumEur('costEur'),
    totalMarginEur: sumEur('marginEur'),
    products: results,
  };
}
