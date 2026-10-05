import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getMarketFromHost } from '@/lib/market-from-host';
import { getPublishedBlogPostBySlug } from '@/lib/blog';
import { getActiveCategories, getProductsByIds } from '@/lib/supabase';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import BlogStructuredData from '@/components/landing/BlogStructuredData';
import { SITE_COPY } from '@/lib/site-copy';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedBlogPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || undefined,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPublishedBlogPostBySlug(params.slug);
  if (!post) notFound();

  const market = getMarketFromHost(headers().get('host'));
  const t = SITE_COPY[market];

  const [categories, linkedProducts] = await Promise.all([
    getActiveCategories(),
    getProductsByIds(post.linked_product_ids),
  ]);

  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString(market === 'fr' ? 'fr-FR' : market === 'es' ? 'es-ES' : 'en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-site-bg text-site-text">
      <BlogStructuredData post={post} />
      <SiteHeader categories={categories} market={market} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/blog" className="text-sm text-site-secondary hover:text-site-primary transition-colors">
          ← {t.nav.blog}
        </Link>

        {post.category && (
          <Link
            href={`/blog?category=${encodeURIComponent(post.category.slug)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mt-4"
            style={{
              backgroundColor: post.category.color ? `${post.category.color}1A` : '#F3F4F6',
              color: post.category.color || '#4B5563',
            }}
          >
            {post.category.icon && <span>{post.category.icon}</span>}
            {post.category.name_fr}
          </Link>
        )}

        <h1 className="text-3xl sm:text-4xl font-extrabold mt-3 mb-2 text-site-primary">{post.title}</h1>

        <div className="flex items-center gap-3 text-sm text-site-text-secondary mb-6">
          {post.author_name && <span>{post.author_name}</span>}
          {publishedDate && <span>· {publishedDate}</span>}
        </div>

        {post.cover_image_url && (
          <div className="relative w-full h-64 sm:h-96 rounded-xl overflow-hidden mb-8 bg-site-bg">
            <Image
              src={getCloudinaryUrl(post.cover_image_url, { width: 1000, crop: 'fill', format: 'auto', quality: 'auto' })}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <article className="prose prose-headings:text-site-primary prose-a:text-site-secondary max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </article>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-white border border-site-border text-site-text-secondary hover:border-site-secondary transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {linkedProducts.length > 0 && (
          <div className="mt-12 border-t border-site-border pt-8">
            <h2 className="text-lg font-bold text-site-primary mb-4">{t.home.ourAdvice}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {linkedProducts.map((p) => {
                const img = p.image_url
                  ? getCloudinaryUrl(p.image_url, { width: 300, height: 300, crop: 'fill', format: 'auto', quality: 'auto' })
                  : null;
                return (
                  // Lien affilié : passe par /api/go/[code] comme partout
                  // ailleurs sur le site (tracking clic inclus), jamais un
                  // lien direct vers le marchand.
                  <a
                    key={p.id}
                    href={`/api/go/${p.redirect_code}`}
                    className="bg-white border border-site-border rounded-xl overflow-hidden hover:border-site-secondary hover:shadow-md transition-all group flex flex-col"
                  >
                    <div className="aspect-square relative bg-site-bg flex-shrink-0">
                      {img ? (
                        <Image
                          src={img}
                          alt={p.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized={img.includes('/fetch/')}
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl text-site-border">📦</div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col gap-1">
                      <p className="text-sm font-medium text-site-text line-clamp-2 leading-snug">{p.hero_title || p.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        {p.price ? (
                          <span className="text-site-cta font-bold text-sm">{p.price.toFixed(2)} €</span>
                        ) : (
                          <span className="text-site-text-secondary text-xs">{t.common.priceAtMerchant}</span>
                        )}
                        <span className="text-xs text-site-text-secondary group-hover:text-site-secondary transition-colors">
                          {t.common.seeArrow}
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <SiteFooter categories={categories} market={market} />
    </div>
  );
}
