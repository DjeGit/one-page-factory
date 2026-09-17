import MarketPageTabs from '@/components/admin/market/MarketPageTabs';
import ApiStatusPanel from '@/components/admin/ApiStatusPanel';
import { getSupabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function getMarketData(market: 'fr' | 'es' | 'com') {
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from('market_products')
    .select('*')
    .eq('market_id', market)
    .order('trend_score', { ascending: false })
    .order('confidence_score', { ascending: false })
    .limit(100);
  return data || [];
}

export default async function MarketPage() {
  const cookieStore = cookies();
  const market = (cookieStore.get('opf_market')?.value ?? 'fr') as 'fr' | 'es' | 'com';

  const products = await getMarketData(market);
  const lastRefreshed = products.length > 0 ? products[0].last_refreshed : null;

  // Vérification des clés API côté serveur (env vars)
  const apiStatus = {
    serpapi: !!process.env.SERPAPI_KEY,
    keepa: !!process.env.KEEPA_API_KEY,
    dataforseo: !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD),
    awin: !!process.env.AWIN_API_KEY,
  };

  const marketLabels: Record<string, string> = {
    fr: '🇫🇷 France · amazon.fr',
    es: '🇪🇸 Espagne · amazon.es',
    com: '🌍 International · amazon.com',
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Étude de marché</h1>
            <p className="text-gray-500 mt-1">
              Top 100 produits tendance · {marketLabels[market]} · Données analysées par IA
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Données IA · À croiser avec vos propres recherches</span>
          </div>
        </div>

        {/* Stats bar by category */}
        <div className="mt-5 grid grid-cols-5 gap-4">
          {[
            { label: 'Tech & Gadgets', icon: '💻' },
            { label: 'Mode & Beauté', icon: '💄' },
            { label: 'Lifestyle & Maison', icon: '🏠' },
            { label: 'Sport & Bien-être', icon: '🏋️' },
            { label: 'Art & Créativité', icon: '🎨' },
          ].map((cat) => (
            <div
              key={cat.label}
              className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3"
            >
              <span className="text-2xl">{cat.icon}</span>
              <div>
                <p className="text-lg font-black text-gray-900">
                  {products.filter((p) => p.category === cat.label).length}
                </p>
                <p className="text-xs text-gray-400 leading-tight">{cat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Status Panel */}
      <ApiStatusPanel status={apiStatus} />

      {/* Product tabs */}
      <MarketPageTabs products={products} lastRefreshed={lastRefreshed} />
    </div>
  );
}
