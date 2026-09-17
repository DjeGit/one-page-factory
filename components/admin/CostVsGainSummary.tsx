import type { MarketROISummary } from '@/lib/analytics/roi';

/**
 * "Coût vs Gain" — Sprint 5. Résumé agrégé par marché (lib/analytics/roi.ts),
 * toujours affiché en EUR pour rester comparable entre FR/ES (EUR natif) et
 * UK (converti depuis GBP via exchange_rates). Réutilisé sur le dashboard
 * et sur Analytics.
 */
export default function CostVsGainSummary({ roi }: { roi: MarketROISummary }) {
  const fmt = (n: number | null) => (n != null ? `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€` : '—');
  const noRate = roi.currency !== 'EUR' && roi.eurRate == null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900">Coût vs Gain</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Estimation à {(roi.products[0]?.conversionRateUsed ?? 0.02) * 100}% de conversion sur les clics · tout converti en EUR
          </p>
        </div>
        {roi.currency !== 'EUR' && (
          <span className="text-xs text-gray-400">
            {roi.eurRate ? `1 EUR ≈ ${roi.eurRate} GBP` : 'Taux de change indisponible'}
          </span>
        )}
      </div>

      {noRate ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <span>⚠️</span>
          <span>
            Taux de change EUR→GBP indisponible pour ce marché — lancez <code className="bg-white px-1 rounded">pipeline-cron.sh exchange-rates</code> une
            première fois (ou attendez le cron quotidien).
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Revenu estimé</p>
            <p className="text-2xl font-black text-gray-900">{fmt(roi.totalRevenueEur)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Coût</p>
            <p className="text-2xl font-black text-gray-900">{fmt(roi.totalCostEur)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Marge</p>
            <p className={`text-2xl font-black ${(roi.totalMarginEur ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmt(roi.totalMarginEur)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
