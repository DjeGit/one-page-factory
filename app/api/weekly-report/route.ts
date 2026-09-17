import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateWeeklyReport } from '@/lib/ai';
import { getActiveMarket } from '@/lib/get-active-market';

export async function POST() {
  const sb = getSupabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const market = getActiveMarket();
  const { data: products } = await sb.from('products').select('id, name, slug, active, price').eq('market', market);

  const stats = await Promise.all((products || []).map(async (p) => {
    const [{ count: clicks }, { count: views }] = await Promise.all([
      sb.from('clicks').select('*', { count: 'exact', head: true }).eq('product_id', p.id).gte('clicked_at', weekAgo),
      sb.from('page_views').select('*', { count: 'exact', head: true }).eq('product_id', p.id).gte('viewed_at', weekAgo),
    ]);
    return { name: p.name, slug: p.slug, clicks: clicks || 0, views: views || 0, ctr: views ? ((clicks || 0) / views * 100).toFixed(1) : '0' };
  }));

  const sorted = stats.sort((a, b) => b.clicks - a.clicks);
  const top3 = sorted.slice(0, 3);
  const flop3 = sorted.slice(-3).filter(p => p.views > 0);

  const report = await generateWeeklyReport(top3, flop3, products?.length || 0);
  return NextResponse.json({ report, stats: sorted, generated_at: new Date().toISOString() });
}
