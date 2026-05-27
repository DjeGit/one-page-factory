'use client';

interface Tool {
  name: string;
  description: string;
  url: string;
  category: 'Spy & Ads' | 'Tendances' | 'Analyse';
  icon: string;
}

const TOOLS: Tool[] = [
  // Spy & Ads
  {
    name: 'BrandSearch',
    description: '4.7M boutiques Shopify + spy ads Meta/TikTok',
    url: 'https://app.brandsearch.co/brand-library?trending=true',
    category: 'Spy & Ads',
    icon: '🔍',
  },
  {
    name: 'Minea',
    description: 'Spy ads Facebook, TikTok, Pinterest',
    url: 'https://minea.com',
    category: 'Spy & Ads',
    icon: '👁️',
  },
  {
    name: 'PiPiADS',
    description: 'Meilleur spy tool TikTok',
    url: 'https://www.pipiads.com',
    category: 'Spy & Ads',
    icon: '🎯',
  },
  {
    name: 'AdSpy',
    description: "Base de données d'ads Facebook massive",
    url: 'https://adspy.com',
    category: 'Spy & Ads',
    icon: '📡',
  },
  // Tendances
  {
    name: 'TikTok Creative Center',
    description: 'Produits viraux TikTok en temps réel',
    url: 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en',
    category: 'Tendances',
    icon: '🎵',
  },
  {
    name: 'Amazon Best Sellers FR',
    description: 'Meilleures ventes Amazon France',
    url: 'https://www.amazon.fr/gp/bestsellers/',
    category: 'Tendances',
    icon: '📦',
  },
  {
    name: 'AliExpress Hot',
    description: 'Produits chauds AliExpress',
    url: 'https://www.aliexpress.com/popular.html',
    category: 'Tendances',
    icon: '🔥',
  },
  {
    name: 'Google Trends',
    description: 'Tendances de recherche Google',
    url: 'https://trends.google.fr/trends/explore?geo=FR',
    category: 'Tendances',
    icon: '📈',
  },
  // Analyse
  {
    name: 'Dropship.io',
    description: 'Base de données Shopify + analytics',
    url: 'https://dropship.io',
    category: 'Analyse',
    icon: '🚀',
  },
  {
    name: 'Sell The Trend',
    description: 'IA pour trouver les winners',
    url: 'https://www.sellthetrend.com',
    category: 'Analyse',
    icon: '🤖',
  },
  {
    name: 'ZIK Analytics',
    description: 'Data eBay + Shopify',
    url: 'https://www.zikanalytics.com',
    category: 'Analyse',
    icon: '📊',
  },
  {
    name: 'Jungle Scout',
    description: 'Recherche produits Amazon',
    url: 'https://www.junglescout.com',
    category: 'Analyse',
    icon: '🌿',
  },
];

const CATEGORY_BADGE: Record<Tool['category'], string> = {
  'Spy & Ads': 'bg-purple-100 text-purple-700',
  Tendances: 'bg-blue-100 text-blue-700',
  Analyse: 'bg-green-100 text-green-700',
};

const CATEGORY_SECTIONS: { label: Tool['category']; emoji: string; description: string }[] = [
  { label: 'Spy & Ads', emoji: '🕵️', description: 'Espionnez les publicités gagnantes de vos concurrents' },
  { label: 'Tendances', emoji: '📈', description: 'Repérez les produits viraux avant tout le monde' },
  { label: 'Analyse', emoji: '🔬', description: 'Analysez les données pour valider vos produits' },
];

export default function ToolsPanel() {
  return (
    <div className="space-y-8">
      {CATEGORY_SECTIONS.map((section) => {
        const tools = TOOLS.filter((t) => t.category === section.label);
        return (
          <div key={section.label}>
            {/* Section header */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{section.emoji}</span>
              <div>
                <h3 className="font-bold text-gray-900">{section.label}</h3>
                <p className="text-xs text-gray-500">{section.description}</p>
              </div>
            </div>

            {/* Tool cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className="group bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col gap-3"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
                        {tool.icon}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm leading-tight">{tool.name}</p>
                        <span
                          className={`inline-block mt-0.5 px-2 py-0.5 text-xs font-medium rounded-full ${CATEGORY_BADGE[tool.category]}`}
                        >
                          {tool.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-500 leading-relaxed flex-1">{tool.description}</p>

                  {/* CTA */}
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 w-full py-2 bg-gray-50 hover:bg-blue-600 text-gray-600 hover:text-white text-xs font-semibold rounded-xl border border-gray-100 hover:border-blue-600 transition-all"
                  >
                    Ouvrir
                    <span>→</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
