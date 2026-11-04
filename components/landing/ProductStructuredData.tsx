import type { Product } from '@/types';
import { categoryPath } from '@/lib/category-slugs';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import { getProductGallery } from '@/lib/product-images';
import { serializeJsonLd } from '@/lib/json-ld';
import { MARKET_HREFLANG, marketUrl } from '@/lib/site-url';
import { DEFAULT_MARKET, isValidMarket } from '@/lib/market';
import type { Market } from '@/lib/market';
import { getStructuredOffer } from '@/lib/pricing';
import { SITE_COPY } from '@/lib/site-copy';

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
 *  - `offers` n'est émis que si la fiche AFFICHE un prix (même règle que
 *    l'affichage : lib/pricing.ts getStructuredOffer — prix daté, jamais
 *    Amazon tant que SHOW_PRICES est coupé). Même montant, même devise que
 *    la page : on ne déclare jamais à Google un prix que le visiteur ne voit
 *    pas (11/2026 : l'ancien test SHOW_PRICES seul masquait à tort les prix
 *    marchands affichés avec astérisque, et forçait l'euro pour une fiche en
 *    livres) ;
 *  - FAQPage ajouté quand la fiche affiche une FAQ (mêmes questions/réponses
 *    que celles visibles) ;
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

  const offer = getStructuredOffer(product, SITE_COPY[m].product.locale, m);
  const faq = (product.faq ?? []).filter((f) => f && f.question?.trim() && f.answer?.trim());

  const productNode = {
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.name,
    description: product.description ?? undefined,
    image: images.length > 0 ? images : undefined,
    url: productUrl,
    offers: offer
      ? {
          '@type': 'Offer',
          price: offer.price,
          priceCurrency: offer.priceCurrency,
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
      ...(faq.length > 0
        ? [
            {
              '@type': 'FAQPage',
              '@id': `${productUrl}#faq`,
              inLanguage: MARKET_HREFLANG[m],
              mainEntity: faq.map((f) => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: { '@type': 'Answer', text: f.answer },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
    />
  );
}
