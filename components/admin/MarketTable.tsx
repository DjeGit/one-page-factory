'use client';

import { useState, useCallback } from 'react';

interface MarketProduct {
  id: string;
  category: string;
  name: string;
  description: string;
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
  best_offer: string;
  best_offer_price: number | null;
  platforms: string[];
  confidence_score: number;
  trend_score: number;
  source_notes: string;
  last_refreshed: string;
}

const CATEGORIES = ['all', 'Tech & Gadgets', 'Mode & Beauté', 'Lifestyle & Maison', 'Sport & Bien-être', 'Art & Créativité'];

const CATEGORY_COLORS: Record<string, string> = {
  'Tech & Gadgets':    'bg-blue-100 text-blue-700',
  'Mode & Beauté':     'bg-pink-100 text-pink-700',
  'Lifestyle & Maison':'bg-amber-100 text-amber-700',
  'Sport & Bien-être': 'bg-green-100 text-green-700',
  'Art & Créativité':  'bg-purple-100 text-purple-700',
};

const CATEGORY_ICONS: Record<string, string> = {
  'Tech & Gadgets':    '💻',
  'Mode & Beauté':     '💄',
  'Lifestyle & Maison':'🏠',
  'Sport & Bien-être': '🏋️',
  'Art & Créativité':  '🎨',
};

function ScoreBadge({ score, type }: { score: number; type: 'trend' | 'confidence' }) {
  const color =
    score >= 8 ? (type === 'trend' ? 'bg-orange-500' : 'bg-green-500') :
    score >= 5 ? (type === 'trend' ? 'bg-yellow-500' : 'bg-blue-500') :
    'bg-gray-300';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-3 rounded-sm ${i < score ? color : 'bg-gray-100'}`}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-gray-600">{score}/10</span>
    </div>
  );
}

interface Props {
  initialData: MarketProduct[];
  lastRefreshed: string | null;
}

export default function MarketTable({ initialData, lastRefreshed }: Props) {
  const [data, setData] = useState<MarketProduct[]>(initialData);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'trend_score' | 'confidence_score' | 'price_avg'>('trend_score');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(lastRefreshed);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [addingToFactory, setAddingToFactory] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    if (!confirm('Cette opération va interroger OpenAI pour les 5 catégories (~0.05€). Continuer ?')) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/market/refresh', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        const fresh = await fetch('/api/market').then(r => r.json());
        setData(fresh);
        setRefreshedAt(json.refreshed_at);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Supprimer ce produit de la veille ?')) return;
    await fetch(`/api/market/${id}`, { method: 'DELETE' });
    setData(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleAddToFactory = useCallback(async (product: MarketProduct) => {
    setAddingToFactory(product.id);
    try {
      // Generate content with AI then redirect to new product form
      const params = new URLSearchParams({
        name: product.name,
        description: product.description,
        price: String(product.price_avg || product.price_min || ''),
        prefill: '1',
      });
      window.location.href = `/admin/products/new?${params.toString()}`;
    } finally {
      setAddingToFactory(null);
    }
  }, []);

  const filtered = data
    .filter(p => activeCategory === 'all' || p.category === activeCategory)
    .filter(p =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'trend_score') return b.trend_score - a.trend_score;
      if (sortBy === 'confidence_score') return b.confidence_score - a.confidence_score;
      return (b.price_avg || 0) - (a.price_avg || 0);
    });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="trend_score">Trier : Tendance</option>
            <option value="confidence_score">Trier : Fiabilité</option>
            <option value="price_avg">Trier : Prix</option>
          </select>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? 'Analyse en cours...' : 'Actualiser via IA'}
          </button>
        </div>

        {refreshedAt && (
          <p className="text-xs text-gray-400 mt-3">
            Dernière analyse : {new Date(refreshedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeCategory === cat
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            {cat !== 'all' && <span>{CATEGORY_ICONS[cat]}</span>}
            {cat === 'all' ? `Tous (${data.length})` : `${cat} (${data.filter(p => p.category === cat).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-500 font-medium mb-1">Aucun produit trouvé</p>
            <p className="text-gray-400 text-sm">
              {data.length === 0
                ? 'Cliquez sur "Actualiser via IA" pour lancer la première analyse de marché'
                : 'Essayez de modifier les filtres'}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-3">Produit</div>
              <div className="col-span-2">Catégorie</div>
              <div className="col-span-2">Prix</div>
              <div className="col-span-1">Tendance</div>
              <div className="col-span-1">Fiabilité</div>
              <div className="col-span-1">Plateformes</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            <div className="divide-y divide-gray-50">
              {filtered.map((product, index) => (
                <div key={product.id}>
                  {/* Main row */}
                  <div
                    className="grid grid-cols-12 gap-2 px-5 py-4 items-start hover:bg-gray-50/70 transition-colors cursor-pointer"
                    onClick={() => setExpandedRow(expandedRow === product.id ? null : product.id)}
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex justify-center pt-0.5">
                      <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-200 text-gray-600' :
                        index === 2 ? 'bg-orange-200 text-orange-700' :
                        'text-gray-400'
                      }`}>
                        {index + 1}
                      </span>
                    </div>

                    {/* Name + description */}
                    <div className="col-span-3 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm leading-snug">
                        {product.trend_score >= 9 && <span className="text-orange-500 mr-1">🔥</span>}
                        {product.name}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{product.description}</p>
                    </div>

                    {/* Category */}
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${CATEGORY_COLORS[product.category] || 'bg-gray-100 text-gray-600'}`}>
                        <span>{CATEGORY_ICONS[product.category]}</span>
                        <span className="hidden lg:inline">{product.category}</span>
                      </span>
                    </div>

                    {/* Price */}
                    <div className="col-span-2">
                      {product.price_avg ? (
                        <div>
                          <span className="font-bold text-gray-800 text-sm">{product.price_avg.toFixed(2)}€</span>
                          <span className="text-xs text-gray-400 block">moy.</span>
                          {product.best_offer_price && (
                            <span className="text-xs text-green-600 font-medium">
                              Meilleur : {product.best_offer_price.toFixed(2)}€
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </div>

                    {/* Trend score */}
                    <div className="col-span-1">
                      <ScoreBadge score={product.trend_score} type="trend" />
                    </div>

                    {/* Confidence score */}
                    <div className="col-span-1">
                      <ScoreBadge score={product.confidence_score} type="confidence" />
                    </div>

                    {/* Platforms */}
                    <div className="col-span-1">
                      <div className="flex flex-wrap gap-0.5">
                        {(product.platforms || []).slice(0, 3).map((p: string) => (
                          <span key={p} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                            {p.length > 8 ? p.slice(0, 7) + '…' : p}
                          </span>
                        ))}
                        {product.platforms?.length > 3 && (
                          <span className="text-xs text-gray-400">+{product.platforms.length - 3}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleAddToFactory(product)}
                        disabled={addingToFactory === product.id}
                        title="Créer une landing page"
                        className="p-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        title="Supprimer"
                        className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedRow === product.id && (
                    <div className="bg-blue-50/50 border-t border-blue-100 px-5 py-4 grid grid-cols-3 gap-6 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Description complète</p>
                        <p className="text-gray-700">{product.description || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Fourchette de prix</p>
                        <p className="text-gray-700">
                          Min : <b>{product.price_min?.toFixed(2) ?? '—'}€</b> · Max : <b>{product.price_max?.toFixed(2) ?? '—'}€</b> · Moy : <b>{product.price_avg?.toFixed(2) ?? '—'}€</b>
                        </p>
                        {product.best_offer && (
                          <p className="text-green-700 font-medium mt-1">
                            🏆 Meilleure offre : {product.best_offer_price?.toFixed(2)}€ sur {product.best_offer}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Pourquoi c&apos;est tendance</p>
                        <p className="text-gray-600 italic">{product.source_notes || '—'}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {product.platforms?.map((p: string) => (
                            <span key={p} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{p}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
              {filtered.length} produit{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''} · Cliquez sur une ligne pour voir le détail · Bouton <strong>+</strong> pour créer une landing page directement
            </div>
          </>
        )}
      </div>
    </div>
  );
}
