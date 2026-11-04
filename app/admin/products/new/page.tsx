import Link from 'next/link';
import ProductForm from '@/components/admin/ProductForm';
import { getCategories } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { getMarketLabel } from '@/lib/market';
import { withAdminAuth } from '@/app/admin/admin-guard';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { template?: string; name?: string; description?: string; price?: string };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default withAdminAuth(async function NewProductPage({ searchParams }: Props) {
  const initialTemplateId = searchParams.template || undefined;
  const categories = await getCategories();
  const market = getActiveMarket();
  // Pré-remplissage depuis l'Étude de marché (bouton « Créer une landing page ») : avant, ces
  // informations étaient dans l'adresse mais jamais lues, le formulaire s'ouvrait vide.
  const prefill = {
    name: one(searchParams.name).slice(0, 200),
    description: one(searchParams.description).slice(0, 2000),
    price: /^\d+([.,]\d+)?$/.test(one(searchParams.price)) ? one(searchParams.price).replace(',', '.') : '',
  };

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
          Renseignez les informations du produit, puis générez le contenu avec l&apos;IA.{' '}
          Il sera créé sur le marché <strong>{getMarketLabel(market)}</strong> (change avec le sélecteur de marché en haut à droite).
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <ProductForm mode="create" initialTemplateId={initialTemplateId} categories={categories} prefill={prefill} market={market} />
      </div>
    </div>
  );
});
