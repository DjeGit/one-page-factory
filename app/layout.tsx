import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Tendpick — Les meilleurs produits du moment',
    template: '%s | Tendpick',
  },
  description: 'Tendpick sélectionne les meilleurs produits Amazon pour vous. Fiches détaillées, avis, et prix mis à jour.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tendpick.com'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}
