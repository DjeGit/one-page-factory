import { getCategories, getCategoryProductCounts } from '@/lib/supabase';
import CategoriesManager from './CategoriesManager';
import { withAdminAuth } from '@/app/admin/admin-guard';

export const dynamic = 'force-dynamic';

export default withAdminAuth(async function CategoriesPage() {
  const [categories, counts] = await Promise.all([getCategories(), getCategoryProductCounts()]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Catégories</h1>
        <p className="text-gray-500 mt-1">
          {categories.length} catégorie{categories.length !== 1 ? 's' : ''} — utilisées pour ranger les produits. Une catégorie s&apos;affiche toute seule sur un site dès qu&apos;elle contient un produit en ligne sur ce marché, et disparaît quand elle est vide.
        </p>
      </div>

      <CategoriesManager initialCategories={categories} counts={counts} />
    </div>
  );
});
