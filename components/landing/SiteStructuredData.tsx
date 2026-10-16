import { serializeJsonLd } from '@/lib/json-ld';
import { MARKET_HREFLANG, marketUrl } from '@/lib/site-url';
import { SITE_COPY } from '@/lib/site-copy';
import type { Market } from '@/lib/market';

/**
 * JSON-LD Organization + WebSite, à placer sur l'accueil de chaque domaine
 * (audit SEO du 07/10, E5b). Ne déclare que des faits vérifiables : nom,
 * URL du domaine, langue, logo (icône du site). Pas de SearchAction : la
 * recherche (/produits?q=) est en noindex, inutile de promettre un champ de
 * recherche dans les résultats Google.
 */
export default function SiteStructuredData({ market }: { market: Market }) {
  const home = marketUrl(market, '/');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${home}#organization`,
        name: 'Tendpick',
        url: home,
        logo: marketUrl(market, '/icon.svg'),
      },
      {
        '@type': 'WebSite',
        '@id': `${home}#website`,
        name: 'Tendpick',
        url: home,
        description: SITE_COPY[market].global.siteDescription,
        inLanguage: MARKET_HREFLANG[market],
        publisher: { '@id': `${home}#organization` },
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />;
}
