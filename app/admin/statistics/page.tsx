import { getDashboardStats } from '@/lib/supabase';
import { computeMarketROI } from '@/lib/analytics/roi';
import { MARKETS } from '@/lib/market';
import StatsCard from '@/components/admin/StatsCard';

export const dynamic = 'force-dynamic';

/**
 * Nav admin — Statistiques. Vue CONSOLIDÉE cross-marché, en plus (pas à la
 * place) des Analytics filtrées par marché actif. Toutes les devises sont
 * ramenées en EUR (lib/analytics/roi.ts) pour être additionnables.
 */
export default async function StatisticsPage() {
  const perMarket = await Promise.all(
    MARKETS.map(async (m) => ({
      market: m,
      stats: await getDashboardStats(m.code),
      roi: await computeMarketROI(m.code),
    }))
  );

  const totals = perMarket.reduce(
    (acc, { stats }) => ({
      products: acc.products + stats.total_products,
      active: acc.active + stats.active_products,
      clicks: acc.clicks + stats.total_clicks,
      views: acc.views + stats.total_views,
    }),
    { products: 0, active: 0, clicks: 0, views: 0 }
  );

  const marketsWithRate = perMarket.filter(({ roi }) => roi.totalMarginEur != null);
  const missingRateMarkets = perMarket.filter(({ roi }) => roi.totalMarginEur == null).map(({ market }) => market.label);
  const totalMarginEur = marketsWithRate.reduce((sum, { roi }) => sum + (roi.totalMarginEur ?? 0), 0);
  const totalRevenueEur = marketsWithRate.reduce((sum, { roi }) => sum + (roi.totalRevenueEur ?? 0), 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Statistiques</h1>
        <p className="text-gray-500 mt-1">Vue consolidée sur les 3 marchés — les Analytics par marché restent dans l&apos;onglet Analytics.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatsCard title="Produits (tous marchés)" value={totals.products} subtitle={`${totals.active} actifs`} color="primary" icon={<span>📦</span>} />
        <StatsCard title="Clics (tous marchés)" value={totals.clicks.toLocaleString('fr-FR')} color="orange" icon={<span>👆</span>} />
        <StatsCard title="Vues (tous marchés)" value={totals.views.toLocaleString('fr-FR')} color="blue" icon={<span>👁️</span>} />
        <StatsCard
          title="Marge estimée (EUR)"
          value={`${totalMarginEur.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€`}
          subtitle={missingRateMarkets.length > 0 ? `Hors ${missingRateMarkets.join(', ')} (taux indisponible)` : 'Tous marchés'}
          color="green"
          icon={<span>💰</span>}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Par marché</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Marché</th>
                <th className="text-right px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produits</th>
                <th className="text-right px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Clics</th>
                <th className="text-right px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vues</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenu (EUR)</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Marge (EUR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {perMarket.map(({ market, stats, roi }) => (
                <tr key={market.code} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    <span className="mr-2">{market.flag}</span>
                    {market.label}
                  </td>
                  <td className="px-4 py-4 text-right">{stats.active_products}/{stats.total_products}</td>
                  <td className="px-4 py-4 text-right">{stats.total_clicks.toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-4 text-right">{stats.total_views.toLocaleString('fr-FR')}</td>
                  <td className="px-6 py-4 text-right">
                    {roi.totalRevenueEur != null ? `${roi.totalRevenueEur.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€` : '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold">
                    {roi.totalMarginEur != null ? (
                      <span className={roi.totalMarginEur >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {roi.totalMarginEur.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€
                      </span>
                    ) : (
                      <span className="text-amber-600 text-xs">taux indisponible</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td className="px-6 py-4">Total</td>
                <td className="px-4 py-4 text-right">{totals.active}/{totals.products}</td>
                <td className="px-4 py-4 text-right">{totals.clicks.toLocaleString('fr-FR')}</td>
                <td className="px-4 py-4 text-right">{totals.views.toLocaleString('fr-FR')}</td>
                <td className="px-6 py-4 text-right">{totalRevenueEur.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€</td>
                <td className="px-6 py-4 text-right">{totalMarginEur.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
