import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { getMarketFromHost } from '@/lib/market-from-host';
import { getPublishedBlogPosts, getBlogCategories } from '@/lib/blog';
import { getActiveCategories } from '@/lib/supabase';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { SITE_COPY } from '@/lib/site-copy';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const market = getMarketFromHost(headers().get('host'));
  const t = SITE_COPY[market];
  return {
    title: t.blogPage.metaTitle,
    description: t.blogPage.metaDescription,
  };
}

interface Props {
  searchParams: { tag?: string; category?: string };
}

export default async function BlogIndexPage({ searchParams }: Props) {
  const market = getMarketFromHost(headers().get('host'));
  const t = SITE_COPY[market];
  const tag = searchParams.tag?.trim() || undefined;
  const categorySlug = searchParams.category?.trim() || undefined;

  const [posts, categories, blogCategories] = await Promise.all([
    getPublishedBlogPosts(market, { tag, categorySlug }),
    getActiveCategories(),
    getBlogCategories(),
  ]);

  // Tags disponibles calculés sur la page courante (volume faible au
  // lancement — pas besoin d'une requête dédiée côté DB pour ça).
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();

  return (
    <div className="min-h-screen bg-site-bg text-site-text">
      <SiteHeader categories={categories} market={market} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 text-site-primary">{t.nav.blog}</h1>
        </div>

        {blogCategories.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            <Link
              href={tag ? `/blog?tag=${encodeURIComponent(tag)}` : '/blog'}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors border ${
                !categorySlug
                  ? 'bg-site-primary border-site-primary text-white'
                  : 'bg-white border-site-border text-site-text hover:border-site-secondary'
              }`}
            >
              {t.blogPage.all}
            </Link>
            {blogCategories.map((cat) => {
              const href = `/blog?category=${encodeURIComponent(cat.slug)}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`;
              const active = categorySlug === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={href}
                  // Même format que les autres pastilles de filtre du site
                  // (Tout, Top Ventes) — demande Jerome du 05/10 : pas
                  // d'icône, pas de couleur par catégorie, juste le même
                  // style navy/blanc partout.
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors border ${
                    active
                      ? 'bg-site-primary border-site-primary text-white'
                      : 'bg-white border-site-border text-site-text hover:border-site-secondary'
                  }`}
                >
                  {cat.name_fr}
                </Link>
              );
            })}
          </div>
        )}

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            {allTags.map((tg) => {
              const href = `/blog?tag=${encodeURIComponent(tg)}${categorySlug ? `&category=${encodeURIComponent(categorySlug)}` : ''}`;
              return (
                <Link
                  key={tg}
                  href={href}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                    tag === tg
                      ? 'bg-site-secondary border-site-secondary text-white'
                      : 'bg-white border-site-border text-site-text-secondary hover:border-site-secondary'
                  }`}
                >
                  #{tg}
                </Link>
              );
            })}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-24 text-site-text-secondary">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-lg">{t.blogPage.noArticles}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => {
              const img = post.cover_image_url
                ? getCloudinaryUrl(post.cover_image_url, { width: 500, height: 320, crop: 'fill', format: 'auto', quality: 'auto' })
                : null;
              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="bg-white border border-site-border rounded-xl overflow-hidden hover:border-site-secondary hover:shadow-md transition-all hover:-translate-y-0.5 group flex flex-col"
                >
                  <div className="h-40 relative bg-site-bg flex-shrink-0">
                    {img ? (
                      <Image
                        src={img}
                        alt={t.home.blogImageAlt}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized={img.includes('/fetch/')}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-site-border">📝</div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-1.5 flex-1">
                    {post.category && (
                      <span
                        className="self-start inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold mb-0.5"
                        style={{
                          backgroundColor: post.category.color ? `${post.category.color}1A` : '#F3F4F6',
                          color: post.category.color || '#4B5563',
                        }}
                      >
                        {post.category.icon && <span>{post.category.icon}</span>}
                        {post.category.name_fr}
                      </span>
                    )}
                    <p className="text-base font-bold text-site-text group-hover:text-site-primary transition-colors leading-snug">
                      {post.title}
                    </p>
                    {post.excerpt && <p className="text-sm text-site-text-secondary line-clamp-2">{post.excerpt}</p>}
                    <span className="text-xs font-semibold text-site-secondary mt-1">{t.home.readArticle}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter categories={categories} market={market} />
    </div>
  );
}
