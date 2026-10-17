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
import AffiliateDisclosureBanner from '@/components/landing/AffiliateDisclosureBanner';
import { SITE_COPY } from '@/lib/site-copy';
import { isValidMarket, DEFAULT_MARKET } from '@/lib/market';
import { marketUrl } from '@/lib/site-url';
import { redirectToMarketDomain } from '@/lib/market-redirect';

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
  const url = marketUrl(postMarket, `/blog/${post.slug}`);
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

// Liens du corps d'article (Markdown) : les liens d'affiliation et les
// liens externes portent rel="sponsored nofollow noopener" (consigne Google
// pour les liens commerciaux, audit E10) ; les liens internes restent de
// simples liens.
const MERCHANT_HOSTS = /(^|\.)(amazon\.|amzn\.|rakuten\.|aliexpress\.|awin1\.com|fnac\.|cdiscount\.|darty\.|boulanger\.)/i;

function isMerchantLink(href: string): boolean {
  if (href.startsWith('/api/go/')) return true;
  try {
    return MERCHANT_HOSTS.test(new URL(href).hostname);
  } catch {
    return false;
  }
}

function ArticleLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  if (!href) return <>{children}</>;
  const isInternal = href.startsWith('/') && !href.startsWith('/api/go/');
  if (isInternal) return <Link href={href}>{children}</Link>;
  // Audit du 18/10 : rel="sponsored nofollow" est réservé aux liens
  // commerciaux. Il était appliqué à TOUS les liens http, donc aussi aux
  // sources éditoriales citées (OMS, NHS, INSV, presse) — un signal faux
  // envoyé à Google, et la perte du bénéfice d'une citation de source.
  const merchant = isMerchantLink(href);
  return (
    <a
      href={href}
      rel={merchant ? 'sponsored nofollow noopener noreferrer' : 'noopener noreferrer'}
      target={href.startsWith('/') ? undefined : '_blank'}
    >
      {children}
    </a>
  );
}

// Images insérées dans le corps Markdown : sans ces attributs, le navigateur
// ne réserve pas la place de l'image et la page saute pendant le chargement
// (CLS). ReactMarkdown ne surchargeait que les liens (audit du 17/10).
function ArticleImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || ''}
      loading="lazy"
      decoding="async"
      width={1600}
      height={900}
      className="w-full h-auto rounded-xl"
    />
  );
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPublishedBlogPostBySlug(params.slug);
  if (!post) notFound();

  // Audit C3 : un article ne répond que sur le domaine de son marché.
  redirectToMarketDomain(isValidMarket(post.market) ? post.market : DEFAULT_MARKET, `/blog/${post.slug}`);

  const market = getMarketFromHost(headers().get('host'));
  const t = SITE_COPY[market];

  const [categories, linkedProducts] = await Promise.all([
    getActiveCategories(),
    getProductsByIds(post.linked_product_ids),
  ]);

  // Signal de fraîcheur attendu par Google et par les lecteurs : la date de
  // dernière mise à jour quand elle est postérieure à la publication.
  const DATE_LABELS = {
    fr: { updated: 'Mis à jour le' },
    es: { updated: 'Actualizado el' },
    uk: { updated: 'Updated on' },
  } as const;
  const dateLocale = market === 'fr' ? 'fr-FR' : market === 'es' ? 'es-ES' : 'en-GB';
  const updatedDate =
    post.updated_at && post.published_at && new Date(post.updated_at) > new Date(post.published_at)
      ? new Date(post.updated_at).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })
      : null;

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
      {/* Divulgation avant le clic : elle existait sur les fiches produit,
          pas sur les articles, qui portent aussi des liens commerciaux. */}
      <AffiliateDisclosureBanner market={market} />

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
            {market === 'es' ? post.category.name_es : market === 'uk' ? post.category.name_uk : post.category.name_fr}
          </Link>
        )}

        <h1 className="text-3xl sm:text-4xl font-extrabold mt-3 mb-2 text-site-primary">{post.title}</h1>

        <div className="flex items-center gap-3 text-sm text-site-text-secondary mb-6">
          {post.author_name && <span>{post.author_name}</span>}
          {publishedDate && <span>· {publishedDate}</span>}
          {updatedDate && (
            <span>
              · {DATE_LABELS[market].updated} {updatedDate}
            </span>
          )}
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
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ArticleLink, img: ArticleImage }}>
            {post.content}
          </ReactMarkdown>
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
                  // Carte : le titre et l'image mènent à la FICHE produit
                  // (lien interne, audit E10 : un article doit renforcer les
                  // pages produit) ; le lien « offre » passe par
                  // /api/go/[code] comme partout ailleurs sur le site
                  // (tracking clic inclus), jamais un lien direct vers le
                  // marchand, et porte rel="sponsored nofollow".
                  <div
                    key={p.id}
                    className="bg-white border border-site-border rounded-xl overflow-hidden hover:border-site-secondary hover:shadow-md transition-all group flex flex-col"
                  >
                    <Link href={`/${p.slug}`} className="flex flex-col flex-1">
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
                      <div className="p-3 pb-1">
                        <p className="text-sm font-medium text-site-text line-clamp-2 leading-snug">{p.hero_title || p.name}</p>
                      </div>
                    </Link>
                    <div className="px-3 pb-3 flex items-center justify-between gap-2">
                      {p.price ? (
                        <span className="text-site-cta font-bold text-sm">{p.price.toFixed(2)} €</span>
                      ) : (
                        <span className="text-site-text-secondary text-xs">{t.common.priceAtMerchant}</span>
                      )}
                      <a
                        href={`/api/go/${p.redirect_code}`}
                        rel="sponsored nofollow noopener"
                        className="text-xs font-semibold text-site-secondary hover:text-site-primary transition-colors"
                      >
                        {t.common.seeArrow}
                      </a>
                    </div>
                  </div>
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
