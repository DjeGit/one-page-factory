import Link from 'next/link';
import { getMarketCatalog, getNavCategories } from '@/lib/site-products';
import type { Product } from '@/types';
import { headers } from 'next/headers';
import type { Market } from '@/lib/market';
import PixelInjector from '@/components/landing/PixelInjector';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import HeroCarousel from '@/components/landing/HeroCarousel';
import { TOP_VENTES_SOURCES, getProductSource, type TopVentesSource } from '@/lib/top-ventes';
import { SITE_COPY } from '@/lib/site-copy';
import { getLatestPublishedBlogPosts, getBlogCategoriesCached } from '@/lib/blog';
import { GUIDE_BASE_PATH, GUIDE_CATEGORY_SLUG } from '@/lib/buying-guide';
import type { Metadata } from 'next';
import SiteStructuredData from '@/components/landing/SiteStructuredData';
import { buildAlternates, getRequestMarket, hasIndexBlockingParams } from '@/lib/site-url';
import ProductCard from '@/components/site/ProductCard';
import SiteImage from '@/components/site/SiteImage';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { source?: string };
}

// Audit SEO du 07/10 (C2, E1) : canonical propre + hreflang vers les trois
// versions du site ; la variante filtrée par onglet (?source=) n'est pas
// indexée.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const h = headers();
  const copy = SITE_COPY[getRequestMarket(h)].global;
  const alternates = buildAlternates(h, '/');
  return {
    // Titre et description propres à l'accueil (mots-clés de la marque et des
    // sections), sans le gabarit « | Tendpick » : la marque est déjà dedans.
    title: { absolute: copy.siteTitleDefault },
    description: copy.siteDescription,
    alternates,
    openGraph: {
      type: 'website',
      siteName: 'Tendpick',
      title: copy.siteTitleDefault,
      description: copy.siteDescription,
      url: alternates.canonical,
    },
    robots: hasIndexBlockingParams(searchParams, ['source']) ? { index: false, follow: true } : undefined,
  };
}

export default async function HomePage({ searchParams }: Props) {
  // Marché déduit du domaine (pas de produit ici pour le déduire autrement),
  // même logique que app/layout.tsx (lib/market-from-host.ts).
  const market = getRequestMarket(headers());
  const t = SITE_COPY[market];
  const [catalog, categories, latestBlogPosts, blogCategories] = await Promise.all([
    getMarketCatalog(market),
    getNavCategories(market),
    // Le blog est un bonus : s'il est indisponible, l'accueil s'affiche quand même.
    getLatestPublishedBlogPosts(market, 3).catch(() => []),
    getBlogCategoriesCached().catch(() => []),
  ]);
  // Catalogue en cache 60 s (lib/site-products.ts), du plus récent au plus ancien : les 6 premiers.
  const featured = catalog.slice(0, 6);

  const topVentesWithSource = catalog
    .map((p) => ({ product: p, source: getProductSource(p.affiliate_url) }))
    .filter((x): x is { product: Product; source: TopVentesSource } => x.source !== null);

  const activeSource: TopVentesSource = TOP_VENTES_SOURCES.some((s) => s.key === searchParams.source)
    ? (searchParams.source as TopVentesSource)
    : TOP_VENTES_SOURCES[0].key;

  const topVentesProducts = topVentesWithSource
    .filter((x) => x.source === activeSource)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-site-bg text-site-text">
      <SiteStructuredData market={market} />
      <SiteHeader categories={categories} market={market} />

      {/* Hero — remplacé le 03/10 par un carrousel (demande Jerome, après
          revue de 10 propositions de bannières) : 4 angles retenus
          (bannières 1/3/6/10 de la proposition), décor fixe repris de la
          bannière 5, seul le texte change en fondu. Voir
          components/landing/HeroCarousel.tsx pour le détail et le
          raisonnement. */}
      <HeroCarousel market={market} />

      {/* Top Ventes — design bleu validé (Design.html) : onglets par plateforme
          + grille de vrais produits (pas de notes/étoiles ni badges fictifs :
          aucun champ de note existe sur Product, cf. précédent du code qui a
          justement retiré ces signaux de confiance factices ailleurs). */}
      <section id="top-ventes" className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-20">
        {/* Titre de section (05/10, demande Jerome : retire le kicker
            "Classement" au-dessus du titre) — le wrapper garde les mêmes
            marges mb-6/mb-8 qu'avant pour ne pas resserrer la mise en page.
            pt-12/16 ajouté (05/10, suite) : sans kicker au-dessus, le titre
            touchait directement le bloc hero navy — même échelle que les
            py-16/py-20 des autres sections pleine page plus bas. */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-site-primary">{t.nav.topVentes}</h2>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          {TOP_VENTES_SOURCES.map((s) => (
            <Link
              key={s.key}
              href={`/?source=${s.key}#top-ventes`}
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

        {topVentesProducts.length === 0 ? (
          <p className="text-site-text-secondary">{t.home.emptyPlatform}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {topVentesProducts.map(({ product: p }) => (
              <ProductCard key={p.id} product={p} market={market} variant="boxed" />
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/top-ventes" className="text-site-primary hover:text-site-cta font-medium transition-colors">
            {t.home.seeFullTopVentes}
          </Link>
        </div>
      </section>

      {/* Sélection du moment — repositionnée juste sous Top Ventes et alignée
          sur son format exact (03/10, demande Jerome) : même grille 4
          colonnes, même carte produit (étiquette plateforme texte, pas de
          badge sur l'image), même style de titre. L'ancienne version 3
          colonnes/carte simplifiée est abandonnée au profit de la
          cohérence entre les deux sections produits de la page. */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-site-primary">{t.home.momentSelection}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} market={market} variant="boxed" />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/produits" className="text-site-primary hover:text-site-cta font-medium transition-colors">
              {t.home.seeAllProducts}
            </Link>
          </div>
        </section>
      )}

      {/* Explorer par catégorie (05/10, demande Jerome) : remet en place
          l'ancienne section "Explorer par catégorie" (catégories produit,
          retirée le 03/10 car doublon du menu) mais repointée vers le blog
          par catégorie — chaque tuile mène aux articles de la catégorie,
          pas aux pages produit. Même esprit visuel que l'ancienne version
          (pastille pleine couleur, carte claire) en reprenant la couleur et
          l'icône propres à chaque catégorie de blog.
          Titre renommé "Visiter notre blog" (05/10, suite) : Jerome trouvait
          "Explorer par catégorie" trop générique pour une section qui pointe
          en réalité vers le blog. */}
      {blogCategories.length > 0 && (
        <section className="bg-white px-4 sm:px-16 py-16 flex flex-col gap-6">
          <h2 className="max-w-6xl mx-auto w-full text-2xl sm:text-[28px] font-bold text-site-text">
            {t.home.blogTeaserTitle}
          </h2>
          <div className="max-w-6xl mx-auto w-full grid grid-cols-2 sm:grid-cols-4 gap-6">
            {blogCategories.map((c) => (
              <Link
                key={c.id}
                href={c.slug === GUIDE_CATEGORY_SLUG ? GUIDE_BASE_PATH : `/blog?category=${encodeURIComponent(c.slug)}`}
                className="bg-[#EAF2FB] rounded-2xl p-8 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                {/* Couleur propre à la catégorie, ou bleu secondaire du site
                    par défaut si aucune n'est définie (même comportement que
                    l'ancienne pastille unie de la section produit). */}
                <span
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                  style={{ backgroundColor: c.color || '#4A90D9' }}
                >
                  {c.icon}
                </span>
                <span className="text-lg font-bold text-site-text">
                  {(market === 'es' ? c.name_es : market === 'uk' ? c.name_uk : c.name_fr) || c.name_fr}
                </span>
                <span className="text-[13px] text-site-text-secondary">{t.home.exploreCategoryDesc}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Depuis le blog — déplacée ici (03/10, demande Jerome) : prend la
          place de l'ancienne section "Explorer par catégorie" (retirée,
          doublon du menu), juste après les deux sections produits. Branchée
          sur de vrais articles publiés (Sprint 4, 04/10) — la section
          n'existe plus du tout tant qu'aucun article n'est publié pour ce
          marché, plutôt que d'afficher un état cassé/vide. */}
      {latestBlogPosts.length > 0 && (
        <section className="bg-white border-y border-site-border px-4 sm:px-6 py-16">
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-site-cta mb-1">{t.home.ourAdvice}</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-site-primary">{t.home.fromBlog}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {latestBlogPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="flex flex-col gap-2 group">
                  <div className="h-36 bg-site-bg border border-site-border rounded-lg overflow-hidden flex items-center justify-center text-site-text-secondary text-sm relative">
                    <SiteImage
                      src={post.cover_image_url}
                      alt={post.title}
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      fallback={<span aria-hidden="true" className="text-3xl text-site-border">📝</span>}
                    />
                  </div>
                  <span className="text-base font-bold text-site-text group-hover:text-site-primary transition-colors">{post.title}</span>
                  <span className="text-[13px] text-site-text-secondary">{post.excerpt}</span>
                  <span className="text-[13px] font-semibold text-site-secondary">{t.home.readArticle}</span>
                </Link>
              ))}
            </div>
            <div className="text-center mt-2">
              <Link href="/blog" className="text-site-secondary hover:text-site-primary font-medium transition-colors">
                {t.home.seeAllBlog}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Texte d'introduction (SEO + transparence éditoriale) : contenu
          visible, avec liens internes vers le guide d'achat, le blog et la
          page méthode. */}
      <section className="bg-white border-y border-site-border px-4 sm:px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-site-primary mb-5">{t.home.intro.title}</h2>
          {t.home.intro.paragraphs.map((para, i) => (
            <p key={i} className="text-site-text-secondary leading-relaxed mb-4">
              {para}
            </p>
          ))}
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href={GUIDE_BASE_PATH}
              className="px-5 py-2.5 rounded-full text-sm font-semibold bg-site-primary text-white hover:opacity-90 transition-opacity"
            >
              {t.home.intro.guideCta}
            </Link>
            <Link
              href="/blog"
              className="px-5 py-2.5 rounded-full text-sm font-semibold border border-site-border text-site-text hover:border-site-secondary transition-colors"
            >
              {t.home.intro.blogCta}
            </Link>
            <Link
              href="/methode"
              className="px-5 py-2.5 rounded-full text-sm font-semibold border border-site-border text-site-text hover:border-site-secondary transition-colors"
            >
              {t.footer.method}
            </Link>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment" className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-12 text-site-primary">{t.home.howItWorks}</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {t.home.steps.map((s) => (
              <div key={s.title} className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-site-bg border border-site-border flex items-center justify-center text-3xl">
                  {s.emoji}
                </div>
                <h3 className="font-bold text-lg text-site-primary">{s.title}</h3>
                <p className="text-site-text-secondary text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter categories={categories} market={market} />

      {/* Tracking site (audit 24/09) : home/catalogue n'ont pas de produit
          unique, donc pas de pixel_meta/pixel_tiktok/pixel_gtm par produit —
          on utilise des IDs de pixel globaux (env), avec le même gating de
          consentement que sur les pages produit. */}
      <PixelInjector
        pixelMeta={process.env.SITE_PIXEL_META}
        pixelTiktok={process.env.SITE_PIXEL_TIKTOK}
        pixelGtm={process.env.SITE_PIXEL_GTM}
      />
    </div>
  );
}
