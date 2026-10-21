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
import { GUIDE_BASE_PATH, GUIDE_CATEGORY_SLUG, isGuidePillar } from '@/lib/buying-guide';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

// Guide d'achat par produit (21/10) : /guide-achat/[slug]. Seuls les articles
// de la catégorie « guides-achat » répondent ici ; le guide général (pilier)
// vit sur /guide-achat.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedBlogPostBySlug(params.slug);
  if (!post || post.category?.slug !== GUIDE_CATEGORY_SLUG) return {};
  const postMarket = isValidMarket(post.market) ? post.market : DEFAULT_MARKET;
  const url = marketUrl(postMarket, `${GUIDE_BASE_PATH}/${post.slug}`);
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

export default async function GuideArticlePage({ params }: Props) {
  const post = await getPublishedBlogPostBySlug(params.slug);
  if (!post || post.category?.slug !== GUIDE_CATEGORY_SLUG) notFound();

  const postMarket = isValidMarket(post.market) ? post.market : DEFAULT_MARKET;
  const path = isGuidePillar(postMarket, post.slug) ? GUIDE_BASE_PATH : `${GUIDE_BASE_PATH}/${post.slug}`;
  redirectToMarketDomain(postMarket, path);
  if (path === GUIDE_BASE_PATH) permanentRedirect(GUIDE_BASE_PATH);

  const market = getMarketFromHost(headers().get('host'));
  return <PostView post={post} market={market} section="guide" path={path} />;
}
