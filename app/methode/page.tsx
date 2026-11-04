import { headers } from 'next/headers';
import type { Metadata } from 'next';
import ContentPage from '@/components/layout/ContentPage';
import { buildAlternates, getRequestMarket } from '@/lib/site-url';
import { PAGES_COPY } from '@/lib/pages-copy';

export const dynamic = 'force-dynamic';

const PATH = '/methode';
const KEY = 'method' as const;

export async function generateMetadata(): Promise<Metadata> {
  const h = headers();
  const copy = PAGES_COPY[getRequestMarket(h)][KEY];
  const alternates = buildAlternates(h, PATH);
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates,
    openGraph: {
      type: 'website',
      siteName: 'Tendpick',
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: alternates.canonical,
    },
  };
}

export default function Page() {
  const copy = PAGES_COPY[getRequestMarket(headers())][KEY];
  return <ContentPage copy={copy} path={PATH} />;
}
