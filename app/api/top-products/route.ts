import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { isValidMarket } from '@/lib/market';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { countsByProduct } from '@/lib/analytics/counts';
import { ttlCache } from '@/lib/ttl-cache';
import { dbErrorResponse, unauthorized } from '../_lib/http';

// Avant : route PUBLIQUE exposant clics, vues et CTR de chaque produit. Le classement ne sert qu'au
// tableau de bord (TopProductsLive, appel navigateur avec le cookie admin) : il est donc réservé à l'admin.
export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) return unauthorized();

  const marketParam = request.nextUrl.searchParams.get('market');
  const market = isValidMarket(marketParam) ? marketParam : getActiveMarket();

  try {
    // Le tableau se rafraîchit toutes les 30 s dans chaque onglet ouvert : 15 s de cache
    // évitent de refaire 4 comptages par produit à chaque rafraîchissement.
    const result = await ttlCache(`top-products:${market}`, 15_000, () => computeTopProducts(market));
    return NextResponse.json(result);
  } catch (err) {
    return dbErrorResponse('GET /api/top-products', err);
  }
}

async function computeTopProducts(market: string) {
  const sb = getSupabaseAdmin();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: products, error } = await sb
    .from('products')
    .select('id, name, slug, price')
    .eq('active', true)
    .eq('market', market);
  // Une panne est remontée (500) au lieu d'un classement vide en 200 qui se faisait passer pour « aucun produit ».
  if (error) throw error;
  if (!products || products.length === 0) return [];

  // 4 comptages par produit, par lots en parallèle (avant : tous les produits d'un coup, sans limite).
  const ids = products.map((p) => p.id as string);
  const total = (table: 'clicks' | 'page_views') => (_t: 'clicks' | 'page_views', id: string) =>
    sb.from(table).select('*', { count: 'exact', head: true }).eq('product_id', id);
  const recent = (table: 'clicks' | 'page_views', col: string) => (_t: 'clicks' | 'page_views', id: string) =>
    sb.from(table).select('*', { count: 'exact', head: true }).eq('product_id', id).gte(col, since24h);
  const [totalClicks, clicks24h, totalViews, views24h] = await Promise.all([
    countsByProduct(total('clicks'), 'clicks', ids),
    countsByProduct(recent('clicks', 'clicked_at'), 'clicks', ids),
    countsByProduct(total('page_views'), 'page_views', ids),
    countsByProduct(recent('page_views', 'viewed_at'), 'page_views', ids),
  ]);

  const results = products.map((product) => {
    const tc = totalClicks.get(product.id as string) ?? 0;
    const c24 = clicks24h.get(product.id as string) ?? 0;
    const tv = totalViews.get(product.id as string) ?? 0;
    const v24 = views24h.get(product.id as string) ?? 0;
    const ctr = tv > 0 ? (tc / tv) * 100 : 0;
    const ctr24h = v24 > 0 ? (c24 / v24) * 100 : 0;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      total_clicks: tc,
      clicks_24h: c24,
      total_views: tv,
      views_24h: v24,
      ctr: Math.round(ctr * 10) / 10,
      ctr_24h: Math.round(ctr24h * 10) / 10,
    };
  });

  return results
    .sort((a, b) => b.clicks_24h - a.clicks_24h || b.total_clicks - a.total_clicks)
    .slice(0, 10);
}
