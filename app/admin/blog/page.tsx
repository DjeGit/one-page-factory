import Link from 'next/link';
import { getAllBlogPostsAdmin } from '@/lib/blog';
import BlogPostsTable from './BlogPostsTable';

export const dynamic = 'force-dynamic';

export default async function BlogAdminPage() {
  const posts = await getAllBlogPostsAdmin();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Blog</h1>
          <p className="text-gray-500 mt-1">{posts.length} article{posts.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvel article
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun article</h3>
          <p className="text-gray-500 mb-6">Rédigez un article ou générez un brouillon avec l&apos;IA.</p>
          <Link
            href="/admin/blog/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
          >
            Créer un article
          </Link>
        </div>
      ) : (
        <BlogPostsTable posts={posts} />
      )}
    </div>
  );
}
