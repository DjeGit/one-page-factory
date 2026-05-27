import type { Product } from '@/types';

interface ProductStructuredDataProps {
  product: Product;
}

export default function ProductStructuredData({ product }: ProductStructuredDataProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: product.image_url ?? undefined,
    offers: {
      '@type': 'Offer',
      price: product.price ?? undefined,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: `${siteUrl}/${product.slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
