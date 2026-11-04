import Link from 'next/link';
import BlogPostForm from '@/components/admin/BlogPostForm';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getBlogCategories } from '@/lib/blog';
import { withAdminAuth } from '@/app/admin/admin-guard';

export const dynamic = 'force-dynamic';

// Seuls l'identifiant, le nom, l'adresse et le marché servent au sélecteur de produits liés
// (avant : tous les produits complets des 3 marchés étaient envoyés au navigateur).
async function getBlogProductChoices() {
  const { data } = await getSupabaseAdmin().from('products').select('id, name, slug, market').order('name');
  return (data ?? []) as { id: string; name: string; slug: string; market: string }[];
}

export default withAdminAuth(async function NewBlogPostPage() {
  const [products, categories] = await Promise.all([getBlogProductChoices(), getBlogCategories()]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/admin/blog" className="text-gray-500 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-black text-gray-900">Nouvel article</h1>
        </div>
        <p className="text-gray-500">Rédigez l&apos;article ou générez un brouillon avec l&apos;IA, puis relisez avant de publier.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <BlogPostForm mode="create" products={products} categories={categories} />
      </div>
    </div>
  );
});
