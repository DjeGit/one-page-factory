import type { BlogPost } from '@/types';

interface BlogStructuredDataProps {
  post: BlogPost;
}

/**
 * JSON-LD Article (Sprint 4, chantier "Blog + Vente directe"). Sur le
 * modèle de ProductStructuredData.tsx — mêmes règles : pas de champ
 * inventé, `author`/`publisher` reflètent seulement ce qui est réellement
 * connu (post.author_name, Tendpick comme éditeur).
 */
export default function BlogStructuredData({ post }: BlogStructuredDataProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_image_url ?? undefined,
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at,
    author: post.author_name
      ? { '@type': 'Person', name: post.author_name }
      : { '@type': 'Organization', name: 'Tendpick' },
    publisher: {
      '@type': 'Organization',
      name: 'Tendpick',
    },
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
