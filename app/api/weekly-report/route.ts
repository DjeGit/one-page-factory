import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateWeeklyReport } from '@/lib/ai';
import { isAuthorizedAdminOrInternal } from '@/lib/admin-auth';
import { DEFAULT_MARKET, isValidMarket } from '@/lib/market';
import { countsByProduct } from '@/lib/analytics/counts';
import { aiErrorResponse, badRequest, dbErrorResponse, readOptionalJsonObject, unauthorized } from '../_lib/http';

/**
 * POST /api/weekly-report
 *
 * Deux appelants légitimes :
 *  - le bouton « Rapport hebdomadaire » du tableau de bord (cookie admin) ;
 *  - le cron n8n du lundi 9h (Bearer INTERNAL_API_KEY, ou un secret admin/cron).
 *
 * Corrigé : la route n'acceptait que INTERNAL_API_KEY (requireInternalAuth) — le bouton du tableau de bord,
 * qui n'envoie que le cookie admin, recevait donc toujours une erreur (401, ou 500 si la clé n'était pas
 * configurée). isAuthorizedAdminOrInternal accepte les deux, sans le contournement « clé absente = ouvert ».
 *
 * Body (optionnel) : { "market": "fr" | "es" | "uk" } — défaut: DEFAULT_MARKET.
 * (Pas de getActiveMarket() : il lit le cookie de préférence admin, absent des appels cron.)
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedAdminOrInternal(request)) return unauthorized();

  const parsed = await readOptionalJsonObject(request);
  if ('response' in parsed) return parsed.response;
  const rawMarket = parsed.body.market;
  if (rawMarket !== undefined && rawMarket !== null && rawMarket !== '' && (typeof rawMarket !== 'string' || !isValidMarket(rawMarket))) {
    return badRequest('Marché invalide (fr, es ou uk)');
  }
  const market = typeof rawMarket === 'string' && isValidMarket(rawMarket) ? rawMarket : DEFAULT_MARKET;

  const sb = getSupabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: products, error } = await sb.from('products').select('id, name, slug, active, price').eq('market', market);
  if (error) return dbErrorResponse('weekly-report (produits)', error);

  // Comptages par lots en parallèle (avant : 2 requêtes par produit lancées d'un coup pour TOUT le catalogue).
  const ids = (products ?? []).map((p) => p.id as string);
  const [clickCounts, viewCounts] = await Promise.all([
    countsByProduct((_t, id) => sb.from('clicks').select('*', { count: 'exact', head: true }).eq('product_id', id).gte('clicked_at', weekAgo), 'clicks', ids),
    countsByProduct((_t, id) => sb.from('page_views').select('*', { count: 'exact', head: true }).eq('product_id', id).gte('viewed_at', weekAgo), 'page_views', ids),
  ]);

  const stats = (products ?? []).map((p) => {
    const clicks = clickCounts.get(p.id as string) ?? 0;
    const views = viewCounts.get(p.id as string) ?? 0;
    return { name: p.name, slug: p.slug, clicks, views, ctr: views ? (clicks / views * 100).toFixed(1) : '0' };
  });

  const sorted = stats.sort((a, b) => b.clicks - a.clicks);
  const top3 = sorted.slice(0, 3);
  const flop3 = sorted.slice(-3).filter(p => p.views > 0);

  try {
    const report = await generateWeeklyReport(top3, flop3, products?.length || 0);
    return NextResponse.json({ report, stats: sorted, market, generated_at: new Date().toISOString() });
  } catch (err) {
    return aiErrorResponse('weekly-report (génération)', err);
  }
}
