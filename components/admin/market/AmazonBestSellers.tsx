'use client';

import { useState, useEffect, useCallback } from 'react';

interface AmazonProduct {
  rank: number;
  name: string;
  price: string;
  rating: string;
  image: string;
  url: string;
}

interface AmazonCategory {
  name: string;
  emoji: string;
  url: string;
  products: AmazonProduct[];
  error: string | null;
}

interface AmazonResponse {
  data: AmazonCategory[];
  cached: boolean;
  fetchedAt: string;
}

const CATEGORIES = [
  'Tech & Gadgets',
  'Mode & Beauté',
  'Lifestyle & Maison',
  'Sport & Bien-être',
  'Art & Créativité',
];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

export default function AmazonBestSellers() {
  const [data, setData] = useState<AmazonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/market/amazon');
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
      const json: AmazonResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeData = data?.data.find((c) => c.name === activeCategory);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) +
      ' à ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const catData = data?.data.find((c) => c.name === cat);
            const emoji = catData?.emoji || '';
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'
                }`}
              >
                {emoji && <span>{emoji}</span>}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {data && (
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${data.cached ? 'bg-orange-400' : 'bg-green-500'}`}
              />
              <span className="text-gray-500">
                {data.cached ? 'Cache' : 'Fraîches'} · {formatDate(data.fetchedAt)}
              </span>
            </div>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-all disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
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
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-700 font-semibold mb-1">Impossible de récupérer les données</p>
          <p className="text-red-500 text-sm mb-4">
            Amazon a bloqué la requête — réessayez dans quelques minutes
          </p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Amazon blocked detection */}
      {!loading && !error && activeData?.error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-amber-800 font-semibold text-sm">
              Amazon a bloqué la requête pour cette catégorie
            </p>
            <p className="text-amber-600 text-xs mt-0.5">Réessayez dans quelques minutes</p>
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Products grid */}
      {!loading && !error && activeData && activeData.products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeData.products.map((product) => (
            <div
              key={product.rank}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-orange-300 hover:shadow-sm transition-all flex items-start gap-3"
            >
              {/* Rank badge */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${
                  product.rank <= 3
                    ? 'bg-amber-400 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                #{product.rank}
              </div>

              {/* Product info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
                  {product.name}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {product.price && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg">
                      {product.price}
                    </span>
                  )}
                  {product.rating && (
                    <span className="text-xs text-gray-500 flex items-center gap-0.5">
                      <span className="text-amber-400">★</span>
                      {product.rating.split(' ')[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* CTA */}
              {product.url && product.url !== 'https://www.amazon.fr' && (
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-xs font-medium text-orange-600 hover:text-orange-800 whitespace-nowrap"
                >
                  Voir →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && activeData && activeData.products.length === 0 && !activeData.error && (
        <div className="bg-gray-50 rounded-2xl p-10 text-center">
          <p className="text-gray-500 text-sm">Aucun produit trouvé pour cette catégorie</p>
          <button
            onClick={fetchData}
            className="mt-3 text-sm text-orange-600 hover:underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Attribution */}
      <p className="text-xs text-gray-400 text-center">
        Données scrappées depuis Amazon France · Top 10 meilleures ventes par catégorie · Cache 4h
      </p>
    </div>
  );
}
