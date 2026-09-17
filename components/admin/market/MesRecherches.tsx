'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useMarket } from '@/lib/market-context';
import { getMarketLabel } from '@/lib/market';
import ManualAddForm from './ManualAddForm';

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
  source?: string;
  last_refreshed: string;
}

function ScoreBadge({ score, type }: { score: number; type: 'trend' | 'confidence' }) {
  const color =
    score >= 8 ? (type === 'trend' ? 'bg-orange-500' : 'bg-green-500') : score >= 5 ? (type === 'trend' ? 'bg-yellow-500' : 'bg-blue-500') : 'bg-gray-300';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`w-1.5 h-3 rounded-sm ${i < score ? color : 'bg-gray-100'}`} />
        ))}
      </div>
      <span className="text-xs font-bold text-gray-600">{score}/10</span>
    </div>
  );
}

/**
 * "Mes recherches" — Sprint 4. Remplace l'ancienne "Veille IA" (GPT
 * hallucinant des produits sans source) par les vraies données agrégées
 * depuis les sources actives du registre (lib/integrations/), scorées par
 * lib/market/scoring.ts. Chaque ligne reste traçable à sa source d'origine
 * (colonne `source`) — plus aucune donnée sans provenance.
 *
 * Contient aussi le formulaire d'ajout manuel de produit (indépendant de
 * l'étude de marché), comme demandé explicitement.
 */
export default function MesRecherches() {
  const { market } = useMarket();
  const [data, setData] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [checkingSources, setCheckingSources] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshBanner, setRefreshBanner] = useState<{ ok: boolean; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'trend_score' | 'confidence_score' | 'price_avg'>('trend_score');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/market');
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const checkSources = useCallback(async () => {
    setCheckingSources(true);
    try {
      const res = await fetch('/api/market/refresh');
      const json = await res.json();
      setActiveSources(json.activeSources || []);
    } finally {
      setCheckingSources(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    checkSources();
  }, [loadProducts, checkSources, market]);

  const handleRefresh = useCallback(async () => {
    if (activeSources.length === 0) return;
    if (!confirm(`Interroger les ${activeSources.length} source(s) active(s) pour ${getMarketLabel(market)} et remplacer les données actuelles de ce marché ?`)) return;
    setIsRefreshing(true);
    setRefreshBanner(null);
    try {
      const res = await fetch('/api/market/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const json = await res.json();
      if (json.success) {
        setRefreshBanner({ ok: true, message: `${json.count} produits · sources utilisées : ${json.sourcesUsed.join(', ')}` });
        await loadProducts();
      } else {
        setRefreshBanner({ ok: false, message: json.error });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [activeSources.length, market, loadProducts]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Supprimer ce produit de la veille ?')) return;
    await fetch(`/api/market/${id}`, { method: 'DELETE' });
    setData((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleAddToFactory = useCallback((product: MarketProduct) => {
    const params = new URLSearchParams({
      name: product.name,
      description: product.description,
      price: String(product.price_avg || product.price_min || ''),
      prefill: '1',
    });
    window.location.href = `/admin/products/new?${params.toString()}`;
  }, []);

  const sources = useMemo(() => ['all', ...Array.from(new Set(data.map((p) => p.source).filter(Boolean) as string[]))], [data]);

  const filtered = data
    .filter((p) => sourceFilter === 'all' || p.source === sourceFilter)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'trend_score') return b.trend_score - a.trend_score;
      if (sortBy === 'confidence_score') return b.confidence_score - a.confidence_score;
      return (b.price_avg || 0) - (a.price_avg || 0);
    });

  return (
    <div className="space-y-6">
      <ManualAddForm onCreated={loadProducts} />

      {/* Sources actives + refresh */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              Marché actif : {getMarketLabel(market)}
            </p>
            {checkingSources ? (
              <p className="text-xs text-gray-400 mt-1">Vérification des sources actives...</p>
            ) : activeSources.length > 0 ? (
              <p className="text-xs text-gray-500 mt-1">
                Sources actives : <span className="font-medium text-gray-700">{activeSources.join(', ')}</span>
              </p>
            ) : (
              <p className="text-xs text-amber-600 mt-1">
                Aucune source active — activez-en une dans{' '}
                <a href="/admin/settings/integrations" className="underline font-semibold">
                  Paramètres &gt; Intégrations
                </a>
                .
              </p>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || activeSources.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? 'Actualisation...' : 'Actualiser'}
          </button>
        </div>
        {refreshBanner && (
          <p className={`text-xs mt-3 ${refreshBanner.ok ? 'text-green-600' : 'text-amber-600'}`}>{refreshBanner.message}</p>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            {sources.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'Toutes les sources' : s}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="trend_score">Trier : Score</option>
            <option value="confidence_score">Trier : Fiabilité</option>
            <option value="price_avg">Trier : Prix</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-500 font-medium mb-1">Aucun produit trouvé</p>
            <p className="text-gray-400 text-sm">
              {data.length === 0
                ? 'Activez une source dans Paramètres > Intégrations puis cliquez sur "Actualiser".'
                : 'Essayez de modifier les filtres.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <div className="col-span-3">Produit</div>
              <div className="col-span-2">Source</div>
              <div className="col-span-2">Prix</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-2">Fiabilité</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            <div className="divide-y divide-gray-50">
              {filtered.map((product) => (
                <div key={product.id}>
                  <div
                    className="grid grid-cols-12 gap-2 px-5 py-4 items-start hover:bg-gray-50/70 transition-colors cursor-pointer"
                    onClick={() => setExpandedRow(expandedRow === product.id ? null : product.id)}
                  >
                    <div className="col-span-3 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm leading-snug">{product.name}</div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{product.description}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">
                        {product.source || product.category}
                      </span>
                    </div>
                    <div className="col-span-2">
                      {product.price_avg ? (
                        <span className="font-bold text-gray-800 text-sm">{product.price_avg.toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <ScoreBadge score={product.trend_score} type="trend" />
                    </div>
                    <div className="col-span-2">
                      <ScoreBadge score={product.confidence_score} type="confidence" />
                    </div>
                    <div className="col-span-1 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleAddToFactory(product)}
                        title="Créer une landing page"
                        className="p-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors"
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
                  {expandedRow === product.id && (
                    <div className="bg-blue-50/50 border-t border-blue-100 px-5 py-4 text-sm">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Détail du score</p>
                      <p className="text-gray-700">{product.source_notes || '—'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
              {filtered.length} produit{filtered.length > 1 ? 's' : ''} · traçable{filtered.length > 1 ? 's' : ''} à une vraie source de données
            </div>
          </>
        )}
      </div>
    </div>
  );
}
