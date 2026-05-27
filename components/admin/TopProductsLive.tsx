'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface TopProduct {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  total_clicks: number;
  clicks_24h: number;
  total_views: number;
  views_24h: number;
  ctr: number;
  ctr_24h: number;
}

interface Props {
  initialData: TopProduct[];
}

const REFRESH_INTERVAL = 30_000;

const RANK_STYLES = [
  'bg-yellow-400 text-yellow-900',
  'bg-gray-300 text-gray-700',
  'bg-orange-300 text-orange-900',
];

export default function TopProductsLive({ initialData }: Props) {
  const [data, setData] = useState<TopProduct[]>(initialData);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [flash, setFlash] = useState(false);

  const maxClicks = data.length > 0 ? Math.max(...data.map(p => p.clicks_24h), 1) : 1;

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/top-products', { cache: 'no-store' });
      if (res.ok) {
        const fresh = await res.json();
        setData(fresh);
        setLastUpdated(new Date());
        setSecondsAgo(0);
        setFlash(true);
        setTimeout(() => setFlash(false), 600);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  // Seconds-ago counter
  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsAgo(Math.round((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  const formatSecondsAgo = () => {
    if (secondsAgo < 5) return 'à l\'instant';
    if (secondsAgo < 60) return `il y a ${secondsAgo}s`;
    return `il y a ${Math.floor(secondsAgo / 60)}min`;
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden mb-8 transition-all duration-300 ${flash ? 'ring-2 ring-green-400' : ''}`}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">Top 10 des produits</h2>
          {/* Live badge */}
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-semibold text-green-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Mis à jour {formatSecondsAgo()}</span>
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Rafraîchir"
          >
            <svg
              className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-gray-400 text-sm">Aucune donnée — les stats apparaîtront après les premières visites</p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-4">Produit</div>
            <div className="col-span-4">Clics (24h)</div>
            <div className="col-span-1 text-right">CTR</div>
            <div className="col-span-2 text-right">Total</div>
          </div>

          <div className="divide-y divide-gray-50">
            {data.map((product, index) => {
              const barWidth = maxClicks > 0 ? (product.clicks_24h / maxClicks) * 100 : 0;
              const rankStyle = RANK_STYLES[index] || 'bg-gray-100 text-gray-500';
              const isHot = product.clicks_24h > 0 && index < 3;

              return (
                <div
                  key={product.id}
                  className="px-6 py-3.5 grid grid-cols-12 gap-2 items-center hover:bg-gray-50 transition-colors group"
                >
                  {/* Rank */}
                  <div className="col-span-1 flex justify-center">
                    <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${rankStyle}`}>
                      {index + 1}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="col-span-4 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-900 text-sm truncate">{product.name}</span>
                      {isHot && (
                        <span className="text-orange-500 text-xs flex-shrink-0">🔥</span>
                      )}
                    </div>
                    <Link
                      href={`/${product.slug}`}
                      target="_blank"
                      className="text-xs text-gray-400 hover:text-primary-600 truncate block"
                    >
                      /{product.slug}
                    </Link>
                  </div>

                  {/* Bar + count */}
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            index === 0 ? 'bg-violet-500' :
                            index === 1 ? 'bg-violet-400' :
                            index === 2 ? 'bg-violet-300' : 'bg-gray-300'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700 w-8 text-right flex-shrink-0">
                        {product.clicks_24h}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 pl-0.5">
                      {product.views_24h} vues
                    </div>
                  </div>

                  {/* CTR 24h */}
                  <div className="col-span-1 text-right">
                    <span className={`text-sm font-bold ${
                      product.ctr_24h >= 5 ? 'text-green-600' :
                      product.ctr_24h >= 2 ? 'text-orange-500' : 'text-gray-400'
                    }`}>
                      {product.ctr_24h > 0 ? `${product.ctr_24h}%` : '—'}
                    </span>
                  </div>

                  {/* Total clicks */}
                  <div className="col-span-2 text-right">
                    <span className="text-sm text-gray-500 font-medium">{product.total_clicks.toLocaleString('fr-FR')}</span>
                    <div className="text-xs text-gray-300">{product.total_views.toLocaleString('fr-FR')} vues</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Classement par clics sur les dernières 24h · Rafraîchissement auto toutes les 30s
            </p>
            <Link
              href="/admin/analytics"
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              Analytics complets →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
