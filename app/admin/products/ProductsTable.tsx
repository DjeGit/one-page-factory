'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, AnalyticsData } from '@/types';

interface ProductsTableProps {
  products: Product[];
  analyticsMap: Map<string, AnalyticsData>;
}

export default function ProductsTable({ products, analyticsMap }: ProductsTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleDelete = async (product: Product) => {
    if (!confirm(`Supprimer "${product.name}" ? Cette action est irréversible.`)) return;

    setDeletingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (product: Product) => {
    setTogglingId(product.id);
    try {
      await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !product.active }),
      });
      router.refresh();
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produit</th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Prix</th>
              <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Vues</th>
              <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Clics</th>
              <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">CTR</th>
              <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((product) => {
              const analytics = analyticsMap.get(product.id);
              const ctr = analytics ? analytics.ctr : 0;

              return (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  {/* Product name & slug */}
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-400 flex items-center gap-1">
                      <span>/{product.slug}</span>
                      <a
                        href={`/${product.slug}`}
                        target="_blank"
                        className="text-primary-500 hover:text-primary-700 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-4 hidden lg:table-cell">
                    {product.price ? (
                      <span className="font-medium text-gray-900">{product.price.toFixed(2)}€</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  {/* Views */}
                  <td className="px-4 py-4 text-center hidden md:table-cell">
                    <span className="text-gray-700 font-medium">{analytics?.views ?? 0}</span>
                  </td>

                  {/* Clicks */}
                  <td className="px-4 py-4 text-center hidden md:table-cell">
                    <span className="text-gray-700 font-medium">{analytics?.clicks ?? 0}</span>
                  </td>

                  {/* CTR */}
                  <td className="px-4 py-4 text-center hidden lg:table-cell">
                    <span
                      className={`text-sm font-semibold ${
                        ctr >= 5 ? 'text-green-600' : ctr >= 2 ? 'text-orange-500' : 'text-gray-400'
                      }`}
                    >
                      {ctr > 0 ? `${ctr.toFixed(1)}%` : '—'}
                    </span>
                  </td>

                  {/* Active toggle */}
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => handleToggleActive(product)}
                      disabled={togglingId === product.id}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                        product.active ? 'bg-green-500' : 'bg-gray-300'
                      } disabled:opacity-60`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                          product.active ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                        style={{ transform: product.active ? 'translateX(18px)' : 'translateX(2px)' }}
                      />
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        Modifier
                      </Link>
                      <button
                        onClick={() => handleDelete(product)}
                        disabled={deletingId === product.id}
                        className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                      >
                        {deletingId === product.id ? '...' : 'Supprimer'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
