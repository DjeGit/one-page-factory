import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getRequestMarket, getRequestOrigin } from '@/lib/site-url';
import { SITE_COPY } from '@/lib/site-copy';
import './globals.css';

// Métadonnées par défaut par marché (03/10, demande Jerome) : était figé en
// français avant ce correctif — s'applique comme repli sur toute page qui
// ne fournit pas son propre <title>/description. `metadata` (objet statique)
// ne peut pas lire le host ; converti en generateMetadata (async), comme
// app/c/[slug], app/produits et app/top-ventes.
export async function generateMetadata(): Promise<Metadata> {
  const h = headers();
  const market = getRequestMarket(h);
  const origin = getRequestOrigin(h);
  const copy = SITE_COPY[market].global;
  return {
    title: {
      default: copy.siteTitleDefault,
      // Les titres de page ne contiennent plus la marque (audit E3 : « Blog —
      // Tendpick | Tendpick ») : ce gabarit l'ajoute une seule fois.
      template: '%s | Tendpick',
    },
    description: copy.siteDescription,
    // Audit C1 : base des URL absolues (canonical, Open Graph) = domaine du
    // marché de la requête, plus une variable d'environnement unique.
    metadataBase: new URL(origin),
    // './' = l'URL de la page elle-même, sans paramètres de requête. Chaque
    // page peut surcharger (hreflang, canonical produit) ; celles qui ne le
    // font pas ont au moins un canonical propre (audit E1).
    alternates: { canonical: './' },
    // Valeurs par défaut de partage social (audit E2) ; l'image vient de
    // app/opengraph-image.tsx, les pages produit fournissent la leur.
    openGraph: {
      type: 'website',
      siteName: 'Tendpick',
      locale: OG_LOCALE[market],
      title: copy.siteTitleDefault,
      description: copy.siteDescription,
    },
    twitter: { card: 'summary_large_image' },
  };
}

const OG_LOCALE: Record<'fr' | 'es' | 'uk', string> = { fr: 'fr_FR', es: 'es_ES', uk: 'en_GB' };

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
  const market = getRequestMarket(headers());

  return (
    <html lang={HTML_LANG[market]}>
      <body className="bg-site-bg text-site-text">
        {children}
      </body>
    </html>
  );
}
