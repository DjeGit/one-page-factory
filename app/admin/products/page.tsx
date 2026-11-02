import Link from 'next/link';
import { getAllProducts, getAnalytics, getCategories, getSupabaseAdmin } from '@/lib/supabase';
import ProductsTable from './ProductsTable';
import CSVImportButton from '@/components/admin/CSVImportButton';
import CategoryCards from '@/components/admin/products/CategoryCards';
import CategoryBar from '@/components/admin/products/CategoryBar';
import { getActiveMarket } from '@/lib/get-active-market';
import { buildPresence, categoryName, countByCategory, parseCat, productsFor, type PresenceRow } from '@/lib/admin-products-view';

export const dynamic = 'force-dynamic';

const MARKET_LABEL: Record<string, string> = { fr: '🇫🇷 France', es: '🇪🇸 España', uk: '🇬🇧 UK' };

export default async function ProductsPage({ searchParams }: { searchParams?: { cat?: string | string[] } }) {
  const market = getActiveMarket();
  const cat = parseCat(searchParams?.cat);
  const [products, analytics, categories, presenceRes] = await Promise.all([
    getAllProducts(market),
    getAnalytics(market),
    getCategories(),
    getSupabaseAdmin().from('products').select('id, market, active, source_product_ref'),
  ]);

  const analyticsMap = new Map(analytics.map((a) => [a.product_id, a]));
  const presence = buildPresence((presenceRes.data ?? []) as PresenceRow[]);
  const counts = countByCategory(products, categories, market);
  const current = cat.kind === 'slug' ? categories.find((c) => c.slug === cat.slug) : undefined;
  const list = productsFor(products, cat, categories);

  const title =
    cat.kind === 'slug' && current
      ? `${current.icon ?? ''} ${categoryName(current, market)}`.trim()
      : cat.kind === 'none'
        ? '❓ Sans catégorie'
        : cat.kind === 'all'
          ? '🗂️ Tous les produits'
          : 'Produits';

  return (
    <div className="p-8">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          {cat.kind !== 'home' && (
            <Link href="/admin/products" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              ← Toutes les catégories
            </Link>
          )}
          <h1 className="text-2xl font-black text-gray-900 mt-1">{title}</h1>
          <p className="text-gray-500 mt-1">
            {cat.kind === 'home' ? products.length : list.length} produit{(cat.kind === 'home' ? products.length : list.length) !== 1 ? 's' : ''} · marché {MARKET_LABEL[market] ?? market.toUpperCase()}
            <span className="text-gray-400"> (change avec le sélecteur de marché)</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CSVImportButton />
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau produit
          </Link>
        </div>
      </div>

      {cat.kind === 'home' ? (
        <CategoryCards categories={counts.categories} all={counts.all} none={counts.none} />
      ) : cat.kind === 'slug' && !current ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <div className="text-4xl mb-3">🔎</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Catégorie introuvable</h3>
          <Link href="/admin/products" className="text-primary-600 font-semibold">Retour aux catégories</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <CategoryBar categories={counts.categories} current={cat} allTotal={counts.all.total} noneTotal={counts.none.total} />
          {list.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun produit ici pour le moment</h3>
              <p className="text-gray-500 mb-6">Les produits validés dans « Tendance de la semaine » apparaissent ici une fois leurs fiches créées.</p>
              <Link href="/admin/products/new" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors">
                Créer un produit
              </Link>
            </div>
          ) : (
            <ProductsTable products={list} analyticsMap={analyticsMap} presence={presence} />
          )}
        </div>
      )}
    </div>
  );
}
