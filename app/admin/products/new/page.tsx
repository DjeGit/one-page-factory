import Link from 'next/link';
import ProductForm from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/admin/products"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-black text-gray-900">Nouveau produit</h1>
        </div>
        <p className="text-gray-500">
          Renseignez les informations du produit, puis générez le contenu avec l&apos;IA.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
