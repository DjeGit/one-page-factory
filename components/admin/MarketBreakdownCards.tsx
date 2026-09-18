import { MARKETS, type Market } from '@/lib/market';
import type { DashboardStats } from '@/types';

interface MarketRow {
  market: Market;
  stats: DashboardStats;
  marginEur: number | null;
}

interface MarketBreakdownCardsProps {
  rows: MarketRow[];
}

/**
 * Éclatement des stats par marché (section "Par marché" du dashboard,
 * demandée par Jerome en complément de la vue consolidée) — une carte par
 * marché avec les mêmes indicateurs que la grille du haut, pour comparer
 * FR / ES / Anglophone d'un coup d'œil.
 */
export default function MarketBreakdownCards({ rows }: MarketBreakdownCardsProps) {
  return (
    <div className="grid sm:grid-cols-3 gap-5">
      {rows.map(({ market, stats, marginEur }) => {
        const info = MARKETS.find((m) => m.code === market);
        const ctr = stats.total_views > 0 ? ((stats.total_clicks / stats.total_views) * 100).toFixed(1) : null;
        return (
          <div key={market} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2 bg-gray-50">
              <span className="text-xl leading-none">{info?.flag}</span>
              <span className="font-bold text-gray-900">{info?.label ?? market}</span>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Produits actifs</p>
                <p className="text-lg font-black text-gray-900">{stats.active_products}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Clics (total)</p>
                <p className="text-lg font-black text-gray-900">{stats.total_clicks.toLocaleString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Vues (total)</p>
                <p className="text-lg font-black text-gray-900">{stats.total_views.toLocaleString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">CTR</p>
                <p className="text-lg font-black text-gray-900">{ctr !== null ? `${ctr}%` : '—'}</p>
              </div>
              <div className="col-span-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-0.5">Marge estimée</p>
                <p className={`text-lg font-black ${marginEur != null && marginEur >= 0 ? 'text-green-600' : marginEur != null ? 'text-red-600' : 'text-gray-300'}`}>
                  {marginEur != null ? `${marginEur.toFixed(2)}€` : '—'}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
