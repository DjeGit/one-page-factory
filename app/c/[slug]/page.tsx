import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCategoryBySlug, getActiveProductsByCategory, getActiveCategories } from '@/lib/supabase';
import { getNavCategories } from '@/lib/site-products';
import SiteHeader from '@/components/layout/SiteHeader';
import AffiliateDisclosureBanner from '@/components/landing/AffiliateDisclosureBanner';
import SiteFooter from '@/components/layout/SiteFooter';
import ProductCard from '@/components/site/ProductCard';
import { SITE_COPY } from '@/lib/site-copy';
import { baseCategorySlug, categoryAlternates, categoryPath, localizedCategorySlug } from '@/lib/category-slugs';
import { getRequestMarket, marketUrl } from '@/lib/site-url';
import { serializeJsonLd } from '@/lib/json-ld';
import { requestCache } from '@/lib/site-request-cache';
import type { Market } from '@/lib/market';
import type { Category } from '@/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

const MARKET_LIST: Market[] = ['fr', 'es', 'uk'];

function categoryName(category: { name_fr: string; name_es: string; name_uk: string }, market: string): string {
  if (market === 'es') return category.name_es;
  if (market === 'uk') return category.name_uk;
  return category.name_fr;
}

// generateMetadata et la page lisaient chacune la catégorie ET ses produits
// (4 requêtes par visite) : mémoïsé le temps d'une requête.
const loadCategory = requestCache(async (urlSlug: string): Promise<Category | null> => {
  // Slug de base d'abord (gère les slugs traduits et les anciens slugs
  // « gaming… »), puis le slug tel quel au cas où la base contiendrait encore
  // une catégorie sous un ancien nom.
  const base = baseCategorySlug(urlSlug);
  const found = await getCategoryBySlug(base);
  if (found || base === urlSlug) return found;
  return getCategoryBySlug(urlSlug);
});
const loadProducts = requestCache((categoryId: string, market: Market) => getActiveProductsByCategory(categoryId, market));

/** Marchés où la catégorie a au moins un produit en ligne (lectures en cache 60 s). */
async function marketsWithProducts(categoryId: string): Promise<Market[]> {
  try {
    const lists = await Promise.all(MARKET_LIST.map((m) => getActiveCategories(m)));
    return MARKET_LIST.filter((_, i) => lists[i].some((c) => c.id === categoryId));
  } catch {
    return []; // base indisponible : on ne déclare que la page courante (hreflang auto-référent)
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await loadCategory(params.slug);
  if (!category) return {};
  const market = getRequestMarket(headers());
  const name = categoryName(category, market);
  const description = SITE_COPY[market].category.metaDescription(name);
  // Sans produit sur ce marché la page répond 404 (voir CategoryPage) : les
  // métadonnées ne servent que pour une catégorie réellement affichée.
  const available = await marketsWithProducts(category.id);
  const alternates = categoryAlternates(category.slug, market, available);
  return {
    title: name,
    description,
    alternates,
    openGraph: {
      type: 'website',
      siteName: 'Tendpick',
      title: name,
      description,
      url: alternates.canonical,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = await loadCategory(params.slug);
  if (!category) notFound();

  const market = getRequestMarket(headers());
  const products = await loadProducts(category.id, market);

  // Catégorie sans produit en ligne sur CE marché => 404. Elle n'est ni dans le
  // menu, ni dans le sitemap, ni dans les hreflang : afficher une page vide
  // « bientôt disponible » serait du contenu mince (soft 404 aux yeux de
  // Google). Elle réapparaît d'elle-même dès le premier produit en ligne.
  if (products.length === 0) notFound();

  // Slug traduit par marché : l'ancienne URL (slug de base, slug d'un autre
  // marché ou ancien slug « gaming… ») redirige définitivement vers l'adresse
  // du marché courant.
  if (params.slug !== localizedCategorySlug(category.slug, market)) {
    permanentRedirect(categoryPath(category.slug, market));
  }

  const allCategories = await getNavCategories(market);
  const name = categoryName(category, market);
  const t = SITE_COPY[market];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${marketUrl(market, categoryPath(category.slug, market))}#page`,
        name,
        url: marketUrl(market, categoryPath(category.slug, market)),
        inLanguage: t.product.locale.slice(0, 2),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Tendpick', item: marketUrl(market, '/') },
          { '@type': 'ListItem', position: 2, name, item: marketUrl(market, categoryPath(category.slug, market)) },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-site-bg text-site-text">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <SiteHeader categories={allCategories} market={market} />
      <AffiliateDisclosureBanner market={market} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 text-site-primary">{name}</h1>
          <p className="text-site-text-secondary">{t.category.productCount(products.length)}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} market={market} />
          ))}
        </div>
      </main>

      <SiteFooter categories={allCategories} market={market} />
    </div>
  );
}
