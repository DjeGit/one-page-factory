import { headers } from 'next/headers';
import type { Metadata } from 'next';
import ContentPage from '@/components/layout/ContentPage';
import { getMarketFromHost } from '@/lib/market-from-host';
import { buildAlternates } from '@/lib/site-url';
import { PAGES_COPY } from '@/lib/pages-copy';

export const dynamic = 'force-dynamic';

const PATH = '/contact';
const KEY = 'contact' as const;

export async function generateMetadata(): Promise<Metadata> {
  const h = headers();
  const copy = PAGES_COPY[getMarketFromHost(h.get('host'))][KEY];
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
  const copy = PAGES_COPY[getMarketFromHost(headers().get('host'))][KEY];
  return <ContentPage copy={copy} path={PATH} />;
}
