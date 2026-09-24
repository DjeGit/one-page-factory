import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getMarketFromHost } from '@/lib/market-from-host';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Tendpick — Les meilleurs produits du moment',
    template: '%s | Tendpick',
  },
  description: 'Tendpick sélectionne les meilleurs produits Amazon pour vous. Fiches détaillées, avis, et prix mis à jour.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tendpick.com'),
};

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
      <body className="bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}
