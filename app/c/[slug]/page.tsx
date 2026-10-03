import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getCategoryBySlug, getActiveProductsByCategory, getActiveCategories } from '@/lib/supabase';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import { getMarketFromHost } from '@/lib/market-from-host';
import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { getProductSource, TOP_VENTES_SOURCES } from '@/lib/top-ventes';
import { SITE_COPY } from '@/lib/site-copy';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

function categoryName(category: { name_fr: string; name_es: string; name_uk: string }, market: string): string {
  if (market === 'es') return category.name_es;
  if (market === 'uk') return category.name_uk;
  return category.name_fr;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return {};
  const host = headers().get('host');
  const market = getMarketFromHost(host);
  const name = categoryName(category, market);
  return {
    title: `${name} — Tendpick`,
    description: SITE_COPY[market].category.metaDescription(name),
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const host = headers().get('host');
  const market = getMarketFromHost(host);
  const [products, allCategories] = await Promise.all([
    getActiveProductsByCategory(category.id, market),
    getActiveCategories(),
  ]);

  const name = categoryName(category, market);
  const t = SITE_COPY[market];

  return (
    <div className="min-h-screen bg-site-bg text-site-text">
      <SiteHeader categories={allCategories} market={market} />

      {/* La rangée de pastilles catégories (avec icônes) sous le header a
          été retirée (02/10, demande Jerome) : les catégories sont déjà
          accessibles depuis le menu, doublon inutile. */}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          {/* Icône de catégorie retirée du titre (03/10, demande Jerome :
              "enlève tous les icônes à côté des titres"). */}
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 text-site-primary">{name}</h1>
          <p className="text-site-text-secondary">
            {products.length > 0 ? t.category.productCount(products.length) : t.category.newSoon}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24 text-site-text-secondary">
            <div className="text-5xl mb-4">{category.icon || '📦'}</div>
            <p className="text-lg">{t.category.preparing}</p>
            <p className="text-sm mt-2">{t.category.comeBackDays}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => {
              const img = p.image_url
                ? getCloudinaryUrl(p.image_url, { width: 400, height: 400, crop: 'fill', format: 'auto', quality: 'auto' })
                : null;
              const sourceMeta = TOP_VENTES_SOURCES.find((s) => s.key === getProductSource(p.affiliate_url));
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

      <SiteFooter categories={allCategories} market={market} />
    </div>
  );
}
