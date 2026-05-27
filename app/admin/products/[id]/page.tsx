import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/supabase';
import ProductForm from '@/components/admin/ProductForm';

interface Props {
  params: { id: string };
}

export default async function EditProductPage({ params }: Props) {
  const product = await getProductById(params.id);

  if (!product) {
    notFound();
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/products"
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Modifier le produit</h1>
              <p className="text-gray-500 text-sm mt-0.5">{product.name}</p>
            </div>
          </div>

          {/* View live link */}
          {product.active && (
            <a
              href={`/${product.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium text-sm rounded-xl hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Voir la page live
            </a>
          )}
        </div>

        {/* Product info bar */}
        <div className="mt-4 flex flex-wrap gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              product.active
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${product.active ? 'bg-green-500' : 'bg-gray-400'}`} />
            {product.active ? 'Publié' : 'Non publié'}
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-mono bg-gray-100 text-gray-600">
            /{product.slug}
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs bg-gray-100 text-gray-600">
            Code : {product.redirect_code}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <ProductForm mode="edit" product={product} />
      </div>
    </div>
  );
}
