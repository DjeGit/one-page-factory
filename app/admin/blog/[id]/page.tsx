import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPostByIdAdmin, getBlogCategories } from '@/lib/blog';
import { getAllProducts } from '@/lib/supabase';
import BlogPostForm from '@/components/admin/BlogPostForm';

interface Props {
  params: { id: string };
}

export default async function EditBlogPostPage({ params }: Props) {
  const post = await getBlogPostByIdAdmin(params.id);
  if (!post) notFound();

  const [products, categories] = await Promise.all([getAllProducts(), getBlogCategories()]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/blog" className="text-gray-500 hover:text-gray-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Modifier l&apos;article</h1>
              <p className="text-gray-500 text-sm mt-0.5">{post.title}</p>
            </div>
          </div>

          {post.status === 'published' && (
            <a
              href={`/blog/${post.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium text-sm rounded-xl hover:bg-gray-50 transition-colors"
            >
              Voir l&apos;article en ligne
            </a>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <BlogPostForm mode="edit" post={post} products={products} categories={categories} />
      </div>
    </div>
  );
}
