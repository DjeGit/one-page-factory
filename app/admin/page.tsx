import { getDashboardStats } from '@/lib/supabase';
import StatsCard from '@/components/admin/StatsCard';
import DashboardClient from '@/components/admin/DashboardClient';
import CostVsGainSummary from '@/components/admin/CostVsGainSummary';
import MarketBreakdownCards from '@/components/admin/MarketBreakdownCards';
import { getActiveMarket } from '@/lib/get-active-market';
import { MARKETS } from '@/lib/market';
import { computeMarketROI } from '@/lib/analytics/roi';
import type { DashboardStats } from '@/types';
import { withAdminAuth } from '@/app/admin/admin-guard';

export const dynamic = 'force-dynamic';

export default withAdminAuth(async function AdminDashboard() {
  const market = getActiveMarket();
  // Une seule série de requêtes par marché (avant : le marché actif était calculé deux fois).
  const [allStats, allRoi] = await Promise.all([
    Promise.all(MARKETS.map((m) => getDashboardStats(m.code))),
    Promise.all(MARKETS.map((m) => computeMarketROI(m.code))),
  ]);
  const activeIndex = Math.max(0, MARKETS.findIndex((m) => m.code === market));
  const stats = allStats[activeIndex];
  const roi = allRoi[activeIndex];

  // Vue consolidée : somme des 3 marchés (tous en EUR à ce jour, cf.
  // lib/market.ts getCurrencyForMarket — pas de conversion nécessaire).
  const consolidated: DashboardStats = allStats.reduce(
    (acc, s) => ({
      total_products: acc.total_products + s.total_products,
      active_products: acc.active_products + s.active_products,
      clicks_today: acc.clicks_today + s.clicks_today,
      views_today: acc.views_today + s.views_today,
      total_clicks: acc.total_clicks + s.total_clicks,
      total_views: acc.total_views + s.total_views,
    }),
    { total_products: 0, active_products: 0, clicks_today: 0, views_today: 0, total_clicks: 0, total_views: 0 }
  );
  const consolidatedMarginEur = allRoi.some((r) => r.totalMarginEur == null)
    ? null
    : allRoi.reduce((acc, r) => acc + (r.totalMarginEur as number), 0);

  const marketRows = MARKETS.map((m, i) => ({
    market: m.code,
    stats: allStats[i],
    marginEur: allRoi[i].totalMarginEur,
  }));

  return (
    <div className="p-8">
      {/* DashboardClient handles header with report button + quick actions */}
      <DashboardClient />

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10 mt-8">
        <StatsCard
          title="Produits actifs"
          value={stats.active_products}
          subtitle={`${stats.total_products} au total`}
          color="primary"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <StatsCard
          title="Clics aujourd&apos;hui"
          value={stats.clicks_today}
          subtitle={`${stats.total_clicks} au total`}
          color="orange"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          }
        />
        <StatsCard
          title="Vues aujourd&apos;hui"
          value={stats.views_today}
          subtitle={`${stats.total_views} au total`}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />
        <StatsCard
          title="CTR global"
          value={
            stats.total_views > 0
              ? `${((stats.total_clicks / stats.total_views) * 100).toFixed(1)}%`
              : '—'
          }
          subtitle="Taux de clic moyen"
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      {/* Coût vs Gain (Sprint 5) */}
      <div className="mb-10">
        <CostVsGainSummary roi={roi} />
      </div>

      {/* Vue consolidée — 3 marchés */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Vue consolidée — 3 marchés</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <StatsCard
            title="Produits actifs"
            value={consolidated.active_products}
            subtitle={`${consolidated.total_products} au total`}
            color="primary"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />
          <StatsCard
            title="Clics aujourd&apos;hui"
            value={consolidated.clicks_today}
            subtitle={`${consolidated.total_clicks} au total`}
            color="orange"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            }
          />
          <StatsCard
            title="Vues aujourd&apos;hui"
            value={consolidated.views_today}
            subtitle={`${consolidated.total_views} au total`}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
          />
          <StatsCard
            title="CTR global"
            value={
              consolidated.total_views > 0
                ? `${((consolidated.total_clicks / consolidated.total_views) * 100).toFixed(1)}%`
                : '—'
            }
            subtitle="Taux de clic moyen"
            color="green"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <StatsCard
            title="Marge totale"
            value={consolidatedMarginEur != null ? `${consolidatedMarginEur.toFixed(2)}€` : '—'}
            subtitle="3 marchés cumulés"
            color="primary"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Par marché */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Par marché</h2>
        <MarketBreakdownCards rows={marketRows} />
      </div>
    </div>
  );
});
