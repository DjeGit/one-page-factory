import type { BlogPost } from '@/types';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import { serializeJsonLd } from '@/lib/json-ld';
import { MARKET_HREFLANG, marketUrl } from '@/lib/site-url';
import { DEFAULT_MARKET, isValidMarket } from '@/lib/market';

interface BlogStructuredDataProps {
  post: BlogPost;
  /** Chemin public de l'article (21/10 : /blog/[slug] par défaut, /guide-achat… pour le guide). */
  path?: string;
  /** Rubrique du fil d'Ariane (défaut : Blog). */
  sectionName?: string;
  sectionPath?: string;
  /** Page d'accueil du guide : pas de rubrique intermédiaire. */
  hideSectionCrumb?: boolean;
}

/**
 * JSON-LD BlogPosting + BreadcrumbList. Sur le modèle de
 * ProductStructuredData.tsx — mêmes règles : pas de champ inventé,
 * `author`/`publisher` reflètent seulement ce qui est réellement connu
 * (post.author_name, Tendpick comme éditeur).
 *
 * Audit SEO du 07/10 (M8) : type BlogPosting (plus précis qu'Article pour
 * un blog), image en URL absolue (un identifiant Cloudinary n'est pas une
 * URL), langue déclarée, URL sur le domaine du marché de l'article.
 */
export default function BlogStructuredData({
  post,
  path,
  sectionName = 'Blog',
  sectionPath = '/blog',
  hideSectionCrumb = false,
}: BlogStructuredDataProps) {
  const market = isValidMarket(post.market) ? post.market : DEFAULT_MARKET;
  const postUrl = marketUrl(market, path ?? `/blog/${post.slug}`);
  const image = post.cover_image_url
    ? getCloudinaryUrl(post.cover_image_url, { width: 1200, height: 630, crop: 'fill', format: 'auto', quality: 'auto' })
    : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${postUrl}#article`,
        headline: post.title,
        description: post.excerpt ?? undefined,
        image,
        inLanguage: MARKET_HREFLANG[market],
        datePublished: post.published_at ?? post.created_at,
        dateModified: post.updated_at,
        author: post.author_name
          ? { '@type': 'Person', name: post.author_name }
          : { '@type': 'Organization', name: 'Tendpick', url: marketUrl(market, '/') },
        publisher: {
          '@type': 'Organization',
          name: 'Tendpick',
          url: marketUrl(market, '/'),
        },
        mainEntityOfPage: postUrl,
        // Categorie (05/10) : articleSection standard de schema.org pour le
        // rayon editorial d'un article, rempli uniquement si l'article en a une.
        articleSection: post.category?.name_fr ?? undefined,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Tendpick', item: marketUrl(market, '/') },
          ...(hideSectionCrumb ? [] : [{ '@type': 'ListItem', position: 2, name: sectionName, item: marketUrl(market, sectionPath) }]),
          { '@type': 'ListItem', position: hideSectionCrumb ? 2 : 3, name: post.title, item: postUrl },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
    />
  );
}
