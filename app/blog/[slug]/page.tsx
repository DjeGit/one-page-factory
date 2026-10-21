import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getMarketFromHost } from '@/lib/market-from-host';
import { getPublishedBlogPostBySlug } from '@/lib/blog';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import PostView from '@/components/blog/PostView';
import { isValidMarket, DEFAULT_MARKET } from '@/lib/market';
import { marketUrl } from '@/lib/site-url';
import { redirectToMarketDomain } from '@/lib/market-redirect';
import { GUIDE_CATEGORY_SLUG, guidePostPath } from '@/lib/buying-guide';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedBlogPostBySlug(params.slug);
  if (!post) return {};
  // Audit C1/C3 : canonical sur le domaine du marché de l'article, pas de
  // hreflang tant que les traductions ne sont pas reliées entre elles.
  const postMarket = isValidMarket(post.market) ? post.market : DEFAULT_MARKET;
  // Un guide d'achat n'a plus d'adresse sous /blog (redirection 308 plus bas) :
  // son canonical est son adresse dans la section Guide d'achat.
  const isGuide = post.category?.slug === GUIDE_CATEGORY_SLUG;
  const url = marketUrl(postMarket, isGuide ? guidePostPath(postMarket, post.slug) : `/blog/${post.slug}`);
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || undefined;
  const image = post.cover_image_url
    ? getCloudinaryUrl(post.cover_image_url, { width: 1200, height: 630, crop: 'fill', format: 'auto', quality: 'auto' })
    : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      siteName: 'Tendpick',
      title,
      description,
      url,
      images: image ? [image] : undefined,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
    },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPublishedBlogPostBySlug(params.slug);
  if (!post) notFound();

  const postMarket = isValidMarket(post.market) ? post.market : DEFAULT_MARKET;

  // 21/10 : les guides d'achat ont quitté le blog (section /guide-achat).
  // Les anciennes adresses /blog/<slug> redirigent en 308 vers la nouvelle.
  if (post.category?.slug === GUIDE_CATEGORY_SLUG) {
    const target = guidePostPath(postMarket, post.slug);
    redirectToMarketDomain(postMarket, target);
    permanentRedirect(target);
  }

  // Audit C3 : un article ne répond que sur le domaine de son marché.
  redirectToMarketDomain(postMarket, `/blog/${post.slug}`);

  const market = getMarketFromHost(headers().get('host'));

  return <PostView post={post} market={market} section="blog" path={`/blog/${post.slug}`} />;
}
