'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import { getProductGallery } from '@/lib/product-images';
import { filterList, presenceOf, publicUrl, statusCounts, summarizeSync, type StatusTab, type SyncReport, type TableProduct } from '@/lib/admin-products-view';
import { networkErrorMessage, readApiError } from '@/components/admin/http';

/** Statistiques d'un produit (vues, clics, CTR en %), indexées par id. */
export type ProductStats = Record<string, { views: number; clicks: number; ctr: number }>;

interface ProductsTableProps {
  products: TableProduct[];
  analyticsMap: ProductStats;
  /** Marchés où existe chaque produit (clé = produit racine) : pastilles FR / ES / UK. */
  presence?: Record<string, { market: string; active: boolean }[]>;
}

const TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'live', label: 'En ligne' },
  { key: 'draft', label: 'Brouillons' },
];

export default function ProductsTable({ products, analyticsMap, presence = {} }: ProductsTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'info' | 'warning' | 'error'; text: string } | null>(null);
  const [status, setStatus] = useState<StatusTab>('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => statusCounts(products), [products]);
  const shown = useMemo(() => filterList(products, status, query), [products, status, query]);

  const handleDelete = async (product: TableProduct) => {
    const others = presenceOf(product, presence).filter((m) => m.market !== product.market);
    const warning = others.length
      ? `\n\nSeule la version de ce marché est supprimée : ${others.map((m) => m.market.toUpperCase()).join(', ')} ${others.length > 1 ? 'restent' : 'reste'} en place.`
      : '';
    if (!confirm(`Supprimer "${product.name}" ? Cette action est irréversible.${warning}`)) return;

    setDeletingId(product.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotice({ kind: 'info', text: `« ${product.name} » supprimé.` });
        router.refresh();
      } else {
        setNotice({ kind: 'error', text: `Suppression impossible : ${await readApiError(res, 'Suppression refusée')}` });
      }
    } catch (err) {
      setNotice({ kind: 'error', text: `Suppression impossible : ${networkErrorMessage(err)}` });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (product: TableProduct) => {
    setTogglingId(product.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !product.active }),
      });
      if (!res.ok) {
        setNotice({ kind: 'error', text: `Changement impossible : ${await readApiError(res, 'Modification refusée')}` });
        return;
      }
      // Les autres marchés du même produit suivent ; ceux qui ne sont pas prêts (lien neutre, pas de photo) restent en brouillon.
      const data = await res.json().catch(() => null);
      const summary = summarizeSync(data?.sync as SyncReport | undefined, !product.active);
      setNotice(summary.text ? { kind: summary.blocked ? 'warning' : 'info', text: summary.text } : null);
      router.refresh();
    } catch (err) {
      setNotice({ kind: 'error', text: `Changement impossible : ${networkErrorMessage(err)}` });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`px-6 py-3 text-sm border-b flex items-start justify-between gap-4 ${
            notice.kind === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : notice.kind === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-green-50 text-green-800 border-green-200'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="font-semibold shrink-0">Fermer</button>
        </div>
      )}

      {/* Onglets de statut + recherche */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
        <div className="flex gap-1.5" role="tablist" aria-label="Statut">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={status === t.key}
              onClick={() => setStatus(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                status === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label} <span className={status === t.key ? 'text-primary-100' : 'text-gray-400'}>{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un produit…"
          aria-label="Rechercher un produit"
          className="w-full sm:w-64 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
      </div>

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
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  Aucun produit ne correspond{query ? ` à « ${query} »` : ''}.
                </td>
              </tr>
            )}
            {shown.map((product) => {
              const analytics = analyticsMap[product.id];
              const ctr = analytics ? analytics.ctr : 0;
              const cover = getProductGallery(product)[0];
              const markets = presenceOf(product, presence);
              const currency = product.price_currency === 'GBP' ? '£' : '€';

              return (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  {/* Vignette, nom, adresse et marchés */}
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getCloudinaryUrl(cover, { width: 96, height: 96, crop: 'fill', format: 'auto', quality: 'auto' })}
                          alt=""
                          loading="lazy"
                          className="h-12 w-12 shrink-0 rounded-lg bg-gray-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xl" aria-hidden>📦</div>
                      )}
                      <div className="min-w-0">
                        <Link href={`/admin/products/${product.id}`} className="font-semibold text-gray-900 hover:text-primary-700 line-clamp-2">
                          {product.name}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <span className="truncate max-w-[16rem]">/{product.slug}</span>
                            <a href={publicUrl(product.market, `/${product.slug}`)} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-700 transition-colors" aria-label="Voir la page sur le site">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </span>
                          {markets.length > 0 && (
                            <span className="flex gap-1">
                              {markets.map((m) => (
                                <span
                                  key={m.market}
                                  title={`${m.market.toUpperCase()} : ${m.active ? 'en ligne' : 'brouillon'}`}
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${m.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                                >
                                  {m.market.toUpperCase()}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-4 hidden lg:table-cell">
                    {product.price ? (
                      <span className="font-medium text-gray-900">{product.price.toFixed(2)}{currency}</span>
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
                      type="button"
                      role="switch"
                      aria-checked={product.active}
                      onClick={() => handleToggleActive(product)}
                      disabled={togglingId === product.id}
                      title={product.active ? 'En ligne : cliquer pour passer en brouillon' : 'Brouillon : cliquer pour mettre en ligne'}
                      aria-label={`${product.active ? 'Passer en brouillon' : 'Mettre en ligne'} : ${product.name}`}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                        product.active ? 'bg-green-500' : 'bg-gray-300'
                      } disabled:opacity-60`}
                    >
                      <span
                        className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200"
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
                        type="button"
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
