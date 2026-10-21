import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { getMarketFromHost } from '@/lib/market-from-host';
import { getPublishedBlogPostBySlug, getPublishedGuidePosts } from '@/lib/blog';
import { getActiveCategories } from '@/lib/supabase';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import PostView from '@/components/blog/PostView';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { SITE_COPY } from '@/lib/site-copy';
import { buildAlternates } from '@/lib/site-url';
import { GUIDE_BASE_PATH, GUIDE_PILLAR_SLUG } from '@/lib/buying-guide';

export const dynamic = 'force-dynamic';

// Guide d'achat (21/10) : page à part entière, dans le menu entre les
// catégories et le Blog. Elle sert l'article « pilier » du marché (guide
// général d'achat en ligne) et, dessous, la liste des autres guides.
async function getPillar(market: 'fr' | 'es' | 'uk') {
  const post = await getPublishedBlogPostBySlug(GUIDE_PILLAR_SLUG[market]);
  return post && post.market === market ? post : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const h = headers();
  const market = getMarketFromHost(h.get('host'));
  const t = SITE_COPY[market];
  const pillar = await getPillar(market);
  const alternates = buildAlternates(h, GUIDE_BASE_PATH);
  const title = pillar?.meta_title || pillar?.title || t.guidePage.metaTitle;
  const description = pillar?.meta_description || pillar?.excerpt || t.guidePage.metaDescription;
  const image = pillar?.cover_image_url
    ? getCloudinaryUrl(pillar.cover_image_url, { width: 1200, height: 630, crop: 'fill', format: 'auto', quality: 'auto' })
    : undefined;
  return {
    title,
    description,
    alternates,
    openGraph: {
      type: 'article',
      siteName: 'Tendpick',
      title,
      description,
      url: alternates.canonical,
      images: image ? [image] : undefined,
      publishedTime: pillar?.published_at ?? undefined,
      modifiedTime: pillar?.updated_at,
    },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
    // Page vide (guide pas encore publié) = page mince : non indexée.
    robots: pillar ? undefined : { index: false, follow: true },
  };
}

export default async function GuideAchatPage() {
  const market = getMarketFromHost(headers().get('host'));
  const t = SITE_COPY[market];
  const pillar = await getPillar(market);

  if (!pillar) {
    const categories = await getActiveCategories(market);
    return (
      <div className="min-h-screen bg-site-bg text-site-text">
        <SiteHeader categories={categories} market={market} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-6 text-site-primary">{t.nav.buyingGuide}</h1>
          <p className="text-site-text-secondary">{t.blogPage.noArticles}</p>
        </main>
        <SiteFooter categories={categories} market={market} />
      </div>
    );
  }

  const others = (await getPublishedGuidePosts(market)).filter((p) => p.slug !== pillar.slug);

  const more =
    others.length > 0 ? (
      <section className="mt-14 border-t border-site-border pt-8">
        <h2 className="text-lg font-bold text-site-primary mb-4">{t.guidePage.moreGuides}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {others.map((post) => {
            const img = post.cover_image_url
              ? getCloudinaryUrl(post.cover_image_url, { width: 500, height: 320, crop: 'fill', format: 'auto', quality: 'auto' })
              : null;
            return (
              <Link
                key={post.id}
                href={`${GUIDE_BASE_PATH}/${post.slug}`}
                className="bg-white border border-site-border rounded-xl overflow-hidden hover:border-site-secondary hover:shadow-md transition-all group flex flex-col"
              >
                <div className="h-36 relative bg-site-bg flex-shrink-0">
                  {img && (
                    <Image
                      src={img}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized={img.includes('/fetch/')}
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  )}
                </div>
                <div className="p-4 flex flex-col gap-1.5">
                  <p className="text-base font-bold text-site-text group-hover:text-site-primary transition-colors leading-snug">
                    {post.title}
                  </p>
                  {post.excerpt && <p className="text-sm text-site-text-secondary line-clamp-2">{post.excerpt}</p>}
                  <span className="text-xs font-semibold text-site-secondary mt-1">{t.guidePage.readGuide}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    ) : null;

  return <PostView post={pillar} market={market} section="guide" path={GUIDE_BASE_PATH} isGuideHub after={more} />;
}
