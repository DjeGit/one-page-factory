import Link from 'next/link';
import { getAllProducts, getAnalytics } from '@/lib/supabase';
import ProductsTable from './ProductsTable';
import CSVImportButton from '@/components/admin/CSVImportButton';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const [products, analytics] = await Promise.all([
    getAllProducts(),
    getAnalytics(),
  ]);

  // Merge analytics into products
  const analyticsMap = new Map(analytics.map((a) => [a.product_id, a]));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Produits</h1>
          <p className="text-gray-500 mt-1">{products.length} produit{products.length !== 1 ? 's' : ''}</p>
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

      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun produit</h3>
          <p className="text-gray-500 mb-6">Créez votre première page de vente en quelques minutes.</p>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Créer un produit
          </Link>
        </div>
      ) : (
        <ProductsTable products={products} analyticsMap={analyticsMap} />
      )}
    </div>
  );
}
