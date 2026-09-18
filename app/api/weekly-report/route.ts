import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateWeeklyReport } from '@/lib/ai';
import { requireInternalAuth } from '@/lib/api-auth';
import { DEFAULT_MARKET, isValidMarket } from '@/lib/market';

/**
 * POST /api/weekly-report
 *
 * Appelé par cron (n8n, tous les lundis 9h) — route interne, pas d'accès
 * navigateur. Protégée par INTERNAL_API_KEY, comme /api/sync/* et
 * /api/scores/* (lib/api-auth.ts).
 *
 * Body (optionnel) : { "market": "fr" | "es" | "uk" } — défaut: DEFAULT_MARKET.
 *
 * Corrigé le 18/09 : utilisait auparavant getActiveMarket(), qui lit le
 * cookie de préférence admin — inutilisable depuis un appel cron sans
 * session admin (retombait toujours sur le marché par défaut sans qu'on
 * puisse le changer), et la route n'avait aucune authentification.
 */
export async function POST(request: NextRequest) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  let market = DEFAULT_MARKET;
  try {
    const body = await request.json();
    if (isValidMarket(body?.market)) market = body.market;
  } catch {
    // pas de body / body non-JSON — on garde DEFAULT_MARKET
  }

  const sb = getSupabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

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
  return NextResponse.json({ report, stats: sorted, market, generated_at: new Date().toISOString() });
}
