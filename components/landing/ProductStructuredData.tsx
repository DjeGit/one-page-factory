import type { Product } from '@/types';
import { categoryPath } from '@/lib/category-slugs';
import { getCurrencyForMarket } from '@/lib/market';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import { getProductGallery } from '@/lib/product-images';
import { serializeJsonLd } from '@/lib/json-ld';
import { marketUrl } from '@/lib/site-url';
import { DEFAULT_MARKET, isValidMarket } from '@/lib/market';
import type { Market } from '@/lib/market';
import { SHOW_PRICES } from '@/lib/flags';

interface ProductStructuredDataProps {
  product: Product;
  /** Marché de la page (domaine de référence des URL). */
  market?: Market;
  /** Catégorie du produit, pour le fil d'Ariane structuré. */
  categoryName?: string | null;
  categorySlug?: string | null;
}

/**
 * JSON-LD Product + BreadcrumbList. Volontairement SANS bloc Review/
 * AggregateRating (Sprint 5, rapport 18/09) : les "témoignages" affichés sur
 * la page (product.testimonials) sont entièrement générés par l'IA à la
 * création du produit (lib/ai.ts — noms fictifs, note toujours à 5), donc
 * aucun avis réel à déclarer. Les émettre en Review/AggregateRating
 * reviendrait à présenter à Google des avis fabriqués comme authentiques —
 * exactement ce que ses règles sur les structured data sanctionnent. À
 * réactiver seulement le jour où une vraie source d'avis clients existe
 * (import Trustpilot, collecte post-achat...), jamais avant.
 *
 * Corrections de l'audit SEO du 07/10 (E5, E5b) :
 *  - `offers` n'est émis que si un prix existe (une Offer sans prix est
 *    invalide pour Google) ;
 *  - plus de `availability: InStock` codé en dur : le stock des produits
 *    affiliés est inconnu, on ne déclare donc rien plutôt qu'un faux ;
 *  - plus de `brand: Tendpick` : Tendpick n'est pas la marque du produit
 *    (la marque réelle n'est pas stockée aujourd'hui) ;
 *  - URL absolues sur le domaine du marché (plus NEXT_PUBLIC_SITE_URL) ;
 *  - sérialisation échappée (« </script> » dans un titre) ;
 *  - BreadcrumbList Accueil > Catégorie > Produit.
 */
export default function ProductStructuredData({
  product,
  market,
  categoryName,
  categorySlug,
}: ProductStructuredDataProps) {
  const m: Market = market ?? (isValidMarket(product.market) ? product.market : DEFAULT_MARKET);
  const productUrl = marketUrl(m, `/${product.slug}`);

  // Toutes les photos de la galerie (06/10), en URL absolue : un simple
  // public ID Cloudinary n'est pas exploitable par Google. Aucune photo =
  // champ omis (undefined n'est pas sérialisé par JSON.stringify).
  const images = getProductGallery(product).map((img) =>
    getCloudinaryUrl(img, { width: 1200, height: 1200, crop: 'fill', format: 'auto', quality: 'auto' })
  );

  const hasPrice = SHOW_PRICES && typeof product.price === 'number' && product.price > 0;

  const productNode = {
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.name,
    description: product.description ?? undefined,
    image: images.length > 0 ? images : undefined,
    url: productUrl,
    offers: hasPrice
      ? {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: getCurrencyForMarket(m),
          url: productUrl,
        }
      : undefined,
  };

  const crumbs = [{ name: 'Tendpick', url: marketUrl(m, '/') }];
  if (categoryName && categorySlug) crumbs.push({ name: categoryName, url: marketUrl(m, categoryPath(categorySlug, m)) });
  crumbs.push({ name: product.name, url: productUrl });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      productNode,
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          item: c.url,
        })),
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
