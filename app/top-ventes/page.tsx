import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import { getSupabaseAdmin, getActiveCategories } from '@/lib/supabase';
import type { Product } from '@/types';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import { getMarketFromHost } from '@/lib/market-from-host';
import type { Market } from '@/lib/market';
import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { TOP_VENTES_SOURCES, getProductSource, type TopVentesSource } from '@/lib/top-ventes';
import { SITE_COPY } from '@/lib/site-copy';

export const dynamic = 'force-dynamic';

// Metadata par marché (03/10, demande Jerome) : convertie en
// generateMetadata (comme app/c/[slug] et app/produits) pour refléter le
// marché du visiteur au lieu d'un titre/description figés en français.
export async function generateMetadata(): Promise<Metadata> {
  const market = getMarketFromHost(headers().get('host'));
  return {
    title: SITE_COPY[market].topVentesPage.metaTitle,
    description: SITE_COPY[market].topVentesPage.metaDescription,
  };
}

interface Props {
  searchParams: { source?: string };
}

async function getActiveProducts(market: Market): Promise<Product[]> {
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from('products')
      .select('*')
      .eq('active', true)
      .eq('market', market)
      .order('updated_at', { ascending: false });
    return (data as Product[]) || [];
  } catch {
    return [];
  }
}

export default async function TopVentesPage({ searchParams }: Props) {
  const market = getMarketFromHost(headers().get('host'));
  const t = SITE_COPY[market];
  const [allProducts, categories] = await Promise.all([
    getActiveProducts(market),
    getActiveCategories(),
  ]);

  const withSource = allProducts
    .map((p) => ({ product: p, source: getProductSource(p.affiliate_url) }))
    .filter((x): x is { product: Product; source: TopVentesSource } => x.source !== null);

  const activeSource = TOP_VENTES_SOURCES.some((s) => s.key === searchParams.source)
    ? (searchParams.source as TopVentesSource)
    : null;

  const filtered = activeSource
    ? withSource.filter((x) => x.source === activeSource)
    : withSource;

  return (
    <div className="min-h-screen bg-site-bg text-site-text">
      <SiteHeader categories={categories} market={market} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 text-site-primary">{t.nav.topVentes}</h1>
          <p className="text-site-text-secondary">
            {filtered.length > 0 ? t.topVentesPage.productCountAmong(filtered.length) : t.topVentesPage.preparing}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            href="/top-ventes"
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors border ${
              !activeSource
                ? 'bg-site-primary border-site-primary text-white'
                : 'bg-white border-site-border text-site-text hover:border-site-secondary'
            }`}
          >
            {t.topVentesPage.all}
          </Link>
          {TOP_VENTES_SOURCES.map((s) => (
            <Link
              key={s.key}
              href={`/top-ventes?source=${s.key}`}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors border ${
                activeSource === s.key
                  ? 'bg-site-primary border-site-primary text-white'
                  : 'bg-white border-site-border text-site-text hover:border-site-secondary'
              }`}
            >
              {t.common.topPrefix} {s.label}
            </Link>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24 text-site-text-secondary">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-lg">{t.topVentesPage.nonePlatform}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(({ product: p, source }) => {
              const img = p.image_url
                ? getCloudinaryUrl(p.image_url, { width: 400, height: 400, crop: 'fill', format: 'auto', quality: 'auto' })
                : null;
              const sourceMeta = TOP_VENTES_SOURCES.find((s) => s.key === source);
              return (
                <Link
                  key={p.id}
                  href={`/${p.slug}`}
                  className="bg-white border border-site-border rounded-xl overflow-hidden hover:border-site-secondary hover:shadow-md transition-all hover:-translate-y-0.5 group flex flex-col"
                >
                  <div className="aspect-square relative bg-site-bg flex-shrink-0">
                    {img ? (
                      <Image
                        src={img}
                        alt={p.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized={img.includes('/fetch/')}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-site-border">📦</div>
                    )}
                    {sourceMeta && (
                      <span className="absolute top-2 left-2 bg-white/95 border border-site-border rounded-full px-2 py-0.5 text-xs font-medium text-site-text-secondary flex items-center gap-1">
                        <span>{sourceMeta.icon}</span>
                        {sourceMeta.label}
                      </span>
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <p className="text-sm font-medium text-site-text line-clamp-2 leading-snug flex-1">
                      {p.hero_title || p.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      {p.price ? (
                        <span className="text-site-cta font-bold text-sm">{p.price.toFixed(2)} €</span>
                      ) : (
                        <span className="text-site-text-secondary text-xs">{t.common.priceAtMerchant}</span>
                      )}
                      <span className="text-xs text-site-text-secondary group-hover:text-site-secondary transition-colors">
                        {t.common.seeArrow}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter categories={categories} market={market} />
    </div>
  );
}
