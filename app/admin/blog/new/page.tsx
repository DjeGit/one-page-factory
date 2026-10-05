import Link from 'next/link';
import BlogPostForm from '@/components/admin/BlogPostForm';
import { getAllProducts } from '@/lib/supabase';
import { getBlogCategories } from '@/lib/blog';

export default async function NewBlogPostPage() {
  const [products, categories] = await Promise.all([getAllProducts(), getBlogCategories()]);

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
}
