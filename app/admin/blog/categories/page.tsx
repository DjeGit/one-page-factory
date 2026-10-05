import Link from 'next/link';
import { getBlogCategories } from '@/lib/blog';
import BlogCategoriesManager from './BlogCategoriesManager';

export const dynamic = 'force-dynamic';

export default async function BlogCategoriesPage() {
  const categories = await getBlogCategories();

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/blog" className="text-gray-500 hover:text-gray-700 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-black text-gray-900">Catégories du blog</h1>
      </div>
      <p className="text-gray-500 mb-8">
        {categories.length} catégorie{categories.length !== 1 ? 's' : ''} — le rayon principal de chaque article (un seul par article), utilisé pour trier/filtrer le blog. Les tags restent des étiquettes libres en complément.
      </p>

      <BlogCategoriesManager initialCategories={categories} />
    </div>
  );
}
