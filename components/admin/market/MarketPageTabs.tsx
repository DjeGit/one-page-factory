'use client';

import { useState } from 'react';

type Category = 'all' | 'Tech & Gadgets' | 'Mode & Beauté' | 'Lifestyle & Maison' | 'Sport & Bien-être' | 'Art & Créativité';
type SortKey = 'trend' | 'confidence' | 'price';

interface MarketProduct {
  id?: string;
  name: string;
  category: string;
  trend_score?: number;
  confidence_score?: number;
  amazon_url?: string;
  amazon_url_fr?: string;
  amazon_url_es?: string;
  amazon_url_com?: string;
  avg_price?: number;
  commission_rate?: number;
  search_volume?: number;
  competition_level?: string;
  last_refreshed?: string;
  reason?: string;
  market_id?: string;
}

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: 'all', label: 'Tous', icon: '🔥' },
  { id: 'Tech & Gadgets', label: 'Tech & Gadgets', icon: '💻' },
  { id: 'Mode & Beauté', label: 'Mode & Beauté', icon: '💄' },
  { id: 'Lifestyle & Maison', label: 'Lifestyle & Maison', icon: '🏠' },
  { id: 'Sport & Bien-être', label: 'Sport & Bien-être', icon: '🏋️' },
  { id: 'Art & Créativité', label: 'Art & Créativité', icon: '🎨' },
];

function TrendBadge({ score }: { score: number }) {
  const isPos = score >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
      isPos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {isPos ? '↑' : '↓'} {Math.abs(score)}%
    </span>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-7 text-right tabular-nums">{pct}%</span>
    </div>
  );
}

function CompetitionBadge({ level }: { level?: string }) {
  if (!level) return null;
  const styles: Record<string, string> = {
    'Faible': 'bg-green-100 text-green-700',
    'Moyenne': 'bg-amber-100 text-amber-700',
    'Élevée': 'bg-red-100 text-red-700',
    'Forte': 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[level] ?? 'bg-gray-100 text-gray-500'}`}>
      {level}
    </span>
  );
}

export default function MarketPageTabs({
  products,
  lastRefreshed,
}: {
  products: MarketProduct[];
  lastRefreshed: string | null;
}) {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [sortBy, setSortBy] = useState<SortKey>('trend');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = products
    .filter((p) => activeCategory === 'all' || p.category === activeCategory)
    .sort((a, b) => {
      if (sortBy === 'trend') return (b.trend_score ?? 0) - (a.trend_score ?? 0);
      if (sortBy === 'confidence') return (b.confidence_score ?? 0) - (a.confidence_score ?? 0);
      if (sortBy === 'price') return (b.avg_price ?? 0) - (a.avg_price ?? 0);
      return 0;
    });

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await fetch('/api/scores/trending', {
        method: 'POST',
        headers: { 'x-api-key': '907768f83ab84ecace71d3306c02583440c55aeee439044edcaace4caf2cdee2' },
      });
    } catch {
      // silent
    }
    setTimeout(() => {
      setIsRefreshing(false);
      window.location.reload();
    }, 2000);
  }

  const amazonUrl = (p: MarketProduct) =>
    p.amazon_url || p.amazon_url_fr || p.amazon_url_es || p.amazon_url_com;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => {
            const count =
              cat.id === 'all'
                ? products.length
                : products.filter((p) => p.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{cat.icon}</span>
                <span className="hidden sm:inline">{cat.label}</span>
                <span
                  className={`text-xs ml-0.5 ${
                    activeCategory === cat.id ? 'text-primary-200' : 'text-gray-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort + Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white"
          >
            <option value="trend">↑ Tendance</option>
            <option value="confidence">★ Confiance</option>
            <option value="price">€ Prix</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isRefreshing ? 'Actualisation…' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* Last refreshed */}
      {lastRefreshed && (
        <p className="text-xs text-gray-400 mb-4">
          Dernière actualisation :{' '}
          {new Date(lastRefreshed).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <p className="text-5xl mb-3">📊</p>
          <p className="font-semibold text-gray-700">Aucun produit dans cette catégorie</p>
          <p className="text-sm text-gray-400 mt-1">
            Cliquez sur « Actualiser » pour charger les données
          </p>
        </div>
      )}

      {/* Products grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((product, idx) => {
            const key = product.id ?? `${product.name}-${idx}`;
            const isExpanded = expandedId === key;
            const url = amazonUrl(product);

            return (
              <div
                key={key}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-sm transition-all group"
              >
                {/* Rank + name */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                      {product.name}
                    </h3>
                    <span className="inline-block mt-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                      {product.category}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-gray-100 tabular-nums select-none">
                    #{idx + 1}
                  </span>
                </div>

                {/* Scores */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Score tendance</span>
                    <TrendBadge score={product.trend_score ?? 0} />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Confiance IA</span>
                    <ConfidenceBar score={product.confidence_score ?? 0} />
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  {product.avg_price != null && (
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Prix moy.</p>
                      <p className="font-bold text-gray-900 text-sm">
                        {product.avg_price.toFixed(0)}€
                      </p>
                    </div>
                  )}
                  {product.commission_rate != null && (
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Commission</p>
                      <p className="font-bold text-green-600 text-sm">
                        {product.commission_rate}%
                      </p>
                    </div>
                  )}
                  {product.search_volume != null && (
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Volume</p>
                      <p className="font-bold text-gray-700 text-sm">
                        {product.search_volume >= 1000
                          ? `${(product.search_volume / 1000).toFixed(0)}k`
                          : product.search_volume}
                      </p>
                    </div>
                  )}
                  <CompetitionBadge level={product.competition_level} />
                </div>

                {/* AI reason (expandable) */}
                {product.reason && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : key)}
                    className="w-full text-left"
                  >
                    <p
                      className={`text-xs text-gray-500 italic mb-3 ${
                        isExpanded ? '' : 'line-clamp-2'
                      }`}
                    >
                      💡 {product.reason}
                    </p>
                    {product.reason.length > 100 && (
                      <span className="text-xs text-primary-500 font-medium">
                        {isExpanded ? 'Réduire ↑' : 'Voir plus ↓'}
                      </span>
                    )}
                  </button>
                )}

                {/* Amazon CTA */}
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-amber-400 hover:bg-amber-500 text-amber-900 font-semibold text-sm rounded-xl transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Voir sur Amazon
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
