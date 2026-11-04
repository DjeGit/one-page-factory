import Link from 'next/link';
import { headers } from 'next/headers';
import { getMarketCatalog, getNavCategories } from '@/lib/site-products';
import type { Product } from '@/types';
import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import AffiliateDisclosureBanner from '@/components/landing/AffiliateDisclosureBanner';
import SiteFooter from '@/components/layout/SiteFooter';
import { TOP_VENTES_SOURCES, getProductSource, type TopVentesSource } from '@/lib/top-ventes';
import { SITE_COPY } from '@/lib/site-copy';
import { buildAlternates, getRequestMarket, hasIndexBlockingParams } from '@/lib/site-url';
import ProductCard from '@/components/site/ProductCard';

export const dynamic = 'force-dynamic';

// Metadata par marché (03/10, demande Jerome) : convertie en
// generateMetadata (comme app/c/[slug] et app/produits) pour refléter le
// marché du visiteur au lieu d'un titre/description figés en français.
interface Props {
  searchParams: { source?: string };
}

// Audit SEO du 07/10 (C2, E1) : canonical + hreflang ; la variante filtrée
// par plateforme (?source=) n'est pas indexée.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const h = headers();
  const market = getRequestMarket(h);
  return {
    title: SITE_COPY[market].topVentesPage.metaTitle,
    description: SITE_COPY[market].topVentesPage.metaDescription,
    alternates: buildAlternates(h, '/top-ventes'),
    robots: hasIndexBlockingParams(searchParams, ['source']) ? { index: false, follow: true } : undefined,
  };
}

export default async function TopVentesPage({ searchParams }: Props) {
  const market = getRequestMarket(headers());
  const t = SITE_COPY[market];
  const [allProducts, categories] = await Promise.all([
    getMarketCatalog(market),
    getNavCategories(market),
  ]);

  const activeSource = TOP_VENTES_SOURCES.some((s) => s.key === searchParams.source)
    ? (searchParams.source as TopVentesSource)
    : null;

  // « Tout » montre TOUS les produits en ligne (y compris ceux d'une
  // plateforme pas encore listée dans les onglets, ex. un futur réseau Awin) ;
  // un onglet ne montre que sa plateforme.
  const filtered: Product[] = activeSource
    ? allProducts.filter((p) => getProductSource(p.affiliate_url) === activeSource)
    : allProducts;

  return (
    <div className="min-h-screen bg-site-bg text-site-text">
      <SiteHeader categories={categories} market={market} />
      <AffiliateDisclosureBanner market={market} />

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
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} market={market} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter categories={categories} market={market} />
    </div>
  );
}
