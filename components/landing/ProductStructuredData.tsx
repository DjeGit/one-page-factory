import type { Product } from '@/types';
import { getCurrencyForMarket } from '@/lib/market';

interface ProductStructuredDataProps {
  product: Product;
}

/**
 * JSON-LD Product (Sprint 1). Volontairement SANS bloc Review/AggregateRating
 * (Sprint 5, rapport 18/09) : les "témoignages" affichés sur la page
 * (product.testimonials) sont entièrement générés par l'IA à la création du
 * produit (lib/ai.ts — noms fictifs, note toujours à 5), donc aucun avis
 * réel à déclarer. Les émettre en Review/AggregateRating reviendrait à
 * présenter à Google des avis fabriqués comme authentiques — exactement ce
 * que ses règles sur les structured data sanctionnent. À réactiver seulement
 * le jour où une vraie source d'avis clients existe (import Trustpilot,
 * collecte post-achat...), jamais avant.
 *
 * priceCurrency utilise désormais getCurrencyForMarket(product.market) au
 * lieu du 'EUR' codé en dur (toujours EUR aujourd'hui, mais retire le
 * hardcode pour le jour où ça change — cf. lib/market.ts).
 *
 * `brand` : signal E-E-A-T minimal mais honnête — Tendpick est réellement
 * l'éditeur de la page, contrairement à un avis client inventé. Pas de champ
 * "reviewedBy"/date de vérification humaine : on n'a rien de tel à déclarer
 * pour l'instant, donc on ne l'invente pas non plus.
 */
export default function ProductStructuredData({ product }: ProductStructuredDataProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: product.image_url ?? undefined,
    brand: {
      '@type': 'Brand',
      name: 'Tendpick',
    },
    offers: {
      '@type': 'Offer',
      price: product.price ?? undefined,
      priceCurrency: getCurrencyForMarket(product.market),
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
