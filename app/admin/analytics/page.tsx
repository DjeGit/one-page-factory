import Link from 'next/link';
import { getAnalytics, getDashboardStats } from '@/lib/supabase';
import StatsCard from '@/components/admin/StatsCard';
import CostVsGainSummary from '@/components/admin/CostVsGainSummary';
import { getActiveMarket } from '@/lib/get-active-market';
import { computeMarketROI } from '@/lib/analytics/roi';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const market = getActiveMarket();
  const [analytics, stats, roi] = await Promise.all([
    getAnalytics(market),
    getDashboardStats(market),
    computeMarketROI(market),
  ]);
  const roiByProduct = new Map(roi.products.map((r) => [r.productId, r]));

  const totalRevenue = roi.totalRevenueEur ?? 0;
  const avgCtr = analytics.length > 0
    ? analytics.reduce((sum, a) => sum + a.ctr, 0) / analytics.length
    : 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Performances de vos pages de vente</p>
      </div>

      {/* Overview Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatsCard
          title="Total clics"
          value={stats.total_clicks.toLocaleString('fr-FR')}
          subtitle="Tous produits"
          color="orange"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
            </svg>
          }
        />
        <StatsCard
          title="Total vues"
          value={stats.total_views.toLocaleString('fr-FR')}
          subtitle="Pages visitées"
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />
        <StatsCard
          title="CTR moyen"
          value={`${avgCtr.toFixed(1)}%`}
          subtitle="Taux de clic global"
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatsCard
          title="Revenus (EUR)"
          value={`${totalRevenue.toFixed(2)}€`}
          subtitle="Marge réelle si renseignée, sinon estimation 2% conv."
          color="primary"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Coût vs Gain (Sprint 5) */}
      <div className="mb-10">
        <CostVsGainSummary roi={roi} />
      </div>

      {/* Per-product analytics */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Par produit</h2>
        </div>

        {analytics.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-500 mb-4">Aucune donnée disponible pour l&apos;instant</p>
            <Link
              href="/admin/products"
              className="text-primary-600 font-medium hover:text-primary-700"
            >
              Voir les produits →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produit</th>
                  <th className="text-right px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vues</th>
                  <th className="text-right px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Clics</th>
                  <th className="text-right px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">CTR</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Marge (EUR)</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics
                  .sort((a, b) => b.clicks - a.clicks)
                  .map((item) => (
                    <tr key={item.product_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{item.product_name}</div>
                        <div className="text-sm text-gray-400">/{item.slug}</div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-medium text-gray-900">{item.views.toLocaleString('fr-FR')}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-medium text-gray-900">{item.clicks.toLocaleString('fr-FR')}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.ctr >= 5
                              ? 'bg-green-100 text-green-700'
                              : item.ctr >= 2
                              ? 'bg-orange-100 text-orange-700'
                              : item.ctr > 0
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-gray-50 text-gray-400'
                          }`}
                        >
                          {item.ctr > 0 ? `${item.ctr.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right hidden lg:table-cell">
                        {(() => {
                          const productRoi = roiByProduct.get(item.product_id);
                          if (!productRoi || productRoi.marginEur == null) return <span className="text-gray-300">—</span>;
                          return (
                            <span className={`font-semibold ${productRoi.marginEur >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {productRoi.marginEur.toFixed(2)}€
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/${item.product_id}`}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Modifier
                          </Link>
                          <a
                            href={`/${item.slug}`}
                            target="_blank"
                            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                          >
                            Voir
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Marge explanation */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-blue-700">
          <strong>Note :</strong> La colonne « Marge (EUR) » part d&apos;un taux de conversion de 2% par défaut (tant qu&apos;aucune conversion réelle ne remonte des pixels de suivi), et utilise le coût d&apos;achat, le budget pub alloué et la commission réelle si vous les avez renseignés sur la fiche produit (onglet Informations) — sinon 30% par défaut. Ces chiffres restent indicatifs jusqu&apos;à ce que de vraies conversions soient disponibles.
        </div>
      </div>
    </div>
  );
}
