import Link from 'next/link';
import { getAnalytics, getCategories, getSupabaseAdmin } from '@/lib/supabase';
import ProductsTable, { type ProductStats } from './ProductsTable';
import { withAdminAuth } from '@/app/admin/admin-guard';
import CSVImportButton from '@/components/admin/CSVImportButton';
import CategoryCards from '@/components/admin/products/CategoryCards';
import CategoryBar from '@/components/admin/products/CategoryBar';
import { getActiveMarket } from '@/lib/get-active-market';
import { buildPresence, categoryName, countByCategory, parseCat, productsFor, toTableProduct, type PresenceRow } from '@/lib/admin-products-view';

export const dynamic = 'force-dynamic';

const MARKET_LABEL: Record<string, string> = { fr: '🇫🇷 France', es: '🇪🇸 España', uk: '🇬🇧 UK' };

// Colonnes réellement utiles à la liste (pas les textes IA, FAQ, scripts… : plusieurs Ko par produit
// qui seraient sinon envoyés au navigateur pour rien).
const LIST_COLUMNS = 'id, name, slug, active, market, category_id, source_product_ref, price, price_currency, image_url, images';

export default withAdminAuth(async function ProductsPage({ searchParams }: { searchParams?: { cat?: string | string[] } }) {
  const market = getActiveMarket();
  const cat = parseCat(searchParams?.cat);
  // Une seule requête produits pour les 3 marchés : sert à la liste du marché affiché ET aux pastilles FR / ES / UK.
  const [allRowsRes, analytics, categories] = await Promise.all([
    getSupabaseAdmin().from('products').select(LIST_COLUMNS).order('created_at', { ascending: false }),
    getAnalytics(market),
    getCategories(),
  ]);

  if (allRowsRes.error) {
    return (
      <div className="p-8">
        <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
          <p className="font-bold mb-1">Impossible de charger les produits.</p>
          <p className="text-sm mb-4">Vos produits ne sont pas supprimés : la lecture a échoué ({allRowsRes.error.message}). Rechargez la page.</p>
          <Link href="/admin/products" className="inline-block px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700">Recharger</Link>
        </div>
      </div>
    );
  }

  const allRows = (allRowsRes.data ?? []) as unknown as (Parameters<typeof toTableProduct>[0] & { market: string })[];
  const products = allRows.filter((r) => r.market === market).map(toTableProduct);
  const analyticsMap: ProductStats = Object.fromEntries(analytics.map((a) => [a.product_id, { views: a.views, clicks: a.clicks, ctr: a.ctr }]));
  const presence = buildPresence(allRows as unknown as PresenceRow[]);
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
          <Link href="/admin/categories" className="text-sm font-semibold text-gray-600 hover:text-primary-700 underline-offset-2 hover:underline">
            Gérer les catégories
          </Link>
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
});
