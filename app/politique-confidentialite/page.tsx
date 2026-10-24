import { headers } from 'next/headers';
import type { Metadata } from 'next';
import ContentPage from '@/components/layout/ContentPage';
import { getMarketFromHost } from '@/lib/market-from-host';
import { buildAlternates } from '@/lib/site-url';
import { LEGAL_COPY } from '@/lib/legal-copy';

export const dynamic = 'force-dynamic';

const PATH = '/politique-confidentialite';
const KEY = 'privacy' as const;

// Texte légal dans la langue du domaine (fr/es/en). Volontairement non
// indexé : page obligatoire, sans valeur de recherche.
export async function generateMetadata(): Promise<Metadata> {
  const h = headers();
  const copy = LEGAL_COPY[getMarketFromHost(h.get('host'))][KEY];
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: buildAlternates(h, PATH),
    robots: { index: false, follow: true },
  };
}

export default function Page() {
  const copy = LEGAL_COPY[getMarketFromHost(headers().get('host'))][KEY];
  return <ContentPage copy={copy} path={PATH} />;
}
