import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, price, active')
    .eq('active', true);

  if (error || !products || products.length === 0) {
    return NextResponse.json([]);
  }

  const results = await Promise.all(
    products.map(async (product) => {
      const [
        { count: totalClicks },
        { count: clicks24h },
        { count: totalViews },
        { count: views24h },
      ] = await Promise.all([
        supabaseAdmin.from('clicks').select('*', { count: 'exact', head: true }).eq('product_id', product.id),
        supabaseAdmin.from('clicks').select('*', { count: 'exact', head: true }).eq('product_id', product.id).gte('clicked_at', since24h),
        supabaseAdmin.from('page_views').select('*', { count: 'exact', head: true }).eq('product_id', product.id),
        supabaseAdmin.from('page_views').select('*', { count: 'exact', head: true }).eq('product_id', product.id).gte('viewed_at', since24h),
      ]);

      const tc = totalClicks || 0;
      const c24 = clicks24h || 0;
      const tv = totalViews || 0;
      const v24 = views24h || 0;
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
    })
  );

  const sorted = results
    .sort((a, b) => b.clicks_24h - a.clicks_24h || b.total_clicks - a.total_clicks)
    .slice(0, 10);

  return NextResponse.json(sorted);
}
