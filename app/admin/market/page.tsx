import MarketPageTabs from '@/components/admin/market/MarketPageTabs';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getMarketData() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from('market_products')
    .select('*')
    .order('trend_score', { ascending: false })
    .order('confidence_score', { ascending: false })
    .limit(100);
  return data || [];
}

export default async function MarketPage() {
  const products = await getMarketData();
  const lastRefreshed = products.length > 0 ? products[0].last_refreshed : null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Étude de marché</h1>
            <p className="text-gray-500 mt-1">
              Top 100 produits tendance · Classés par catégorie · Données analysées par IA
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Les données sont générées par IA · À croiser avec vos propres recherches</span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-5 grid grid-cols-5 gap-4">
          {[
            { label: 'Tech & Gadgets', icon: '💻', count: products.filter((p) => p.category === 'Tech & Gadgets').length },
            { label: 'Mode & Beauté', icon: '💄', count: products.filter((p) => p.category === 'Mode & Beauté').length },
            { label: 'Lifestyle & Maison', icon: '🏠', count: products.filter((p) => p.category === 'Lifestyle & Maison').length },
            { label: 'Sport & Bien-être', icon: '🏋️', count: products.filter((p) => p.category === 'Sport & Bien-être').length },
            { label: 'Art & Créativité', icon: '🎨', count: products.filter((p) => p.category === 'Art & Créativité').length },
          ].map((cat) => (
            <div
              key={cat.label}
              className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3"
            >
              <span className="text-2xl">{cat.icon}</span>
              <div>
                <p className="text-lg font-black text-gray-900">{cat.count}</p>
                <p className="text-xs text-gray-400 leading-tight">{cat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MarketPageTabs products={products} lastRefreshed={lastRefreshed} />
    </div>
  );
}
