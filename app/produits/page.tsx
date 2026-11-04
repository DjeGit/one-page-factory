import Link from 'next/link';
import { getMarketCatalog, getNavCategories, searchProducts } from '@/lib/site-products';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import PixelInjector from '@/components/landing/PixelInjector';
import SiteHeader from '@/components/layout/SiteHeader';
import AffiliateDisclosureBanner from '@/components/landing/AffiliateDisclosureBanner';
import SiteFooter from '@/components/layout/SiteFooter';
import { SITE_COPY } from '@/lib/site-copy';
import { buildAlternates, getRequestMarket, hasIndexBlockingParams } from '@/lib/site-url';
import ProductCard from '@/components/site/ProductCard';

export const dynamic = 'force-dynamic';

// Metadata par marché (03/10, demande Jerome) : était figée en français
// avant ce correctif — convertie en generateMetadata (comme app/c/[slug])
// pour pouvoir lire le host et donc le marché du visiteur.
interface Props {
  searchParams: { q?: string };
}

// Audit SEO du 07/10 (C2, E1) : canonical + hreflang ; les résultats de
// recherche (?q=) ne sont pas indexés.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const h = headers();
  const market = getRequestMarket(h);
  return {
    title: SITE_COPY[market].products.metaTitle,
    description: SITE_COPY[market].products.metaDescription,
    alternates: buildAlternates(h, '/produits'),
    robots: hasIndexBlockingParams(searchParams, ['q']) ? { index: false, follow: true } : undefined,
  };
}

export default async function ProduitsPage({ searchParams }: Props) {
  // Marché déduit du domaine (pas de produit unique sur cette page),
  // même logique que app/layout.tsx (lib/market-from-host.ts).
  const market = getRequestMarket(headers());
  // Recherche (icône loupe du header) : faite en mémoire sur le catalogue en
  // cache, sans accents ni casse ; la saisie n'atteint jamais la base (audit M10).
  const query = (typeof searchParams.q === 'string' ? searchParams.q.trim().slice(0, 80) : '') || undefined;
  const [catalog, categories] = await Promise.all([getMarketCatalog(market), getNavCategories(market)]);
  const products = query ? searchProducts(catalog, query) : catalog;
  const t = SITE_COPY[market];

  return (
    <div className="min-h-screen bg-site-bg text-site-text">
      <SiteHeader categories={categories} market={market} />
      <AffiliateDisclosureBanner market={market} />

      {/* La rangée de pastilles catégories (avec icônes) sous le header a
          été retirée (02/10, demande Jerome) : les catégories sont déjà
          accessibles depuis le menu, doublon inutile. */}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 text-site-primary">
            {query ? t.products.resultsFor(query) : t.products.ourSelection}
          </h1>
          <p className="text-site-text-secondary">
            {products.length > 0
              ? t.products.productCountUpdated(products.length)
              : query
              ? t.products.noResultsQuery
              : t.products.newSoon}
          </p>
          {query && (
            <Link href="/produits" className="inline-block mt-2 text-sm text-site-secondary hover:text-site-primary transition-colors">
              {t.products.backToCatalog}
            </Link>
          )}
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24 text-site-text-secondary">
            <div className="text-5xl mb-4">📦</div>
            {query ? (
              <p className="text-lg">{t.products.nothingFor(query)}</p>
            ) : (
              <>
                <p className="text-lg">{t.products.firstSelectionPreparing}</p>
                <p className="text-sm mt-2">{t.products.comeBackHours}</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} market={market} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter categories={categories} market={market} />
      <PixelInjector
        pixelMeta={process.env.SITE_PIXEL_META}
        pixelTiktok={process.env.SITE_PIXEL_TIKTOK}
        pixelGtm={process.env.SITE_PIXEL_GTM}
      />
    </div>
  );
}
