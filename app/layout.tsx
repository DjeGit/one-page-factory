import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getMarketFromHost } from '@/lib/market-from-host';
import { SITE_COPY } from '@/lib/site-copy';
import './globals.css';

// Métadonnées par défaut par marché (03/10, demande Jerome) : était figé en
// français avant ce correctif — s'applique comme repli sur toute page qui
// ne fournit pas son propre <title>/description. `metadata` (objet statique)
// ne peut pas lire le host ; converti en generateMetadata (async), comme
// app/c/[slug], app/produits et app/top-ventes.
export async function generateMetadata(): Promise<Metadata> {
  const market = getMarketFromHost(headers().get('host'));
  return {
    title: {
      default: SITE_COPY[market].global.siteTitleDefault,
      template: '%s | Tendpick',
    },
    description: SITE_COPY[market].global.siteDescription,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tendpick.com'),
  };
}

// `lang` codé en dur en "fr" avant ce correctif (22/09) — faux pour tout
// visiteur es/uk. Le layout racine (seul endroit où <html> se rend) n'a pas
// accès à product.market (page enfant), donc on retombe sur la détection
// par host déjà utilisée ailleurs (lib/market-from-host.ts) — correct dès
// que les domaines tendpick.es/tendpick.fr seront pleinement configurés ;
// sur one-page-factory.com (admin) ça retombe sur 'fr', ce qui est le bon
// comportement pour le back-office.
const HTML_LANG: Record<'fr' | 'es' | 'uk', string> = { fr: 'fr', es: 'es', uk: 'en' };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const market = getMarketFromHost(headers().get('host'));

  return (
    <html lang={HTML_LANG[market]}>
      <body className="bg-site-bg text-site-text">
        {children}
      </body>
    </html>
  );
}
