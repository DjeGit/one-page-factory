import { getCategories } from '@/lib/supabase';
import CategoriesManager from './CategoriesManager';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Catégories</h1>
        <p className="text-gray-500 mt-1">
          {categories.length} catégorie{categories.length !== 1 ? 's' : ''} — utilisées pour ranger les produits (import Amazon automatique et ajouts manuels) sur les pages publiques.
        </p>
      </div>

      <CategoriesManager initialCategories={categories} />
    </div>
  );
}
