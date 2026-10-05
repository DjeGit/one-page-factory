import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseAdmin, getActiveCategories } from '@/lib/supabase';
import type { Product } from '@/types';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import { headers } from 'next/headers';
import { getMarketFromHost } from '@/lib/market-from-host';
import type { Market } from '@/lib/market';
import CookieConsent from '@/components/layout/CookieConsent';
import PixelInjector from '@/components/landing/PixelInjector';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import HeroCarousel from '@/components/landing/HeroCarousel';
import { TOP_VENTES_SOURCES, getProductSource, type TopVentesSource } from '@/lib/top-ventes';
import { SITE_COPY } from '@/lib/site-copy';
import { getLatestPublishedBlogPosts, getBlogCategories } from '@/lib/blog';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { source?: string };
}

async function getFeaturedProducts(market: Market): Promise<Product[]> {
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from('products')
      .select('*')
      .eq('active', true)
      .eq('market', market)
      .order('updated_at', { ascending: false })
      .limit(6);
    return (data as Product[]) || [];
  } catch {
    return [];
  }
}

// Top Ventes (accueil) : pool plus large que "Sélection du moment" pour avoir
// de quoi remplir les 3 onglets Amazon/Rakuten/AliExpress (30/09).
async function getTopVentesPool(market: Market): Promise<Product[]> {
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from('products')
      .select('*')
      .eq('active', true)
      .eq('market', market)
      .order('updated_at', { ascending: false })
      .limit(24);
    return (data as Product[]) || [];
  } catch {
    return [];
  }
}

export default async function HomePage({ searchParams }: Props) {
  // Marché déduit du domaine (pas de produit ici pour le déduire autrement),
  // même logique que app/layout.tsx (lib/market-from-host.ts).
  const market = getMarketFromHost(headers().get('host'));
  const t = SITE_COPY[market];
  const [featured, categories, topVentesPool, latestBlogPosts, blogCategories] = await Promise.all([
    getFeaturedProducts(market),
    getActiveCategories(),
    getTopVentesPool(market),
    getLatestPublishedBlogPosts(market, 3),
    getBlogCategories(),
  ]);

  const topVentesWithSource = topVentesPool
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
      <section id="top-ventes" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        {/* Titre de section (05/10, demande Jerome : retire le kicker
            "Classement" au-dessus du titre) — le wrapper garde les mêmes
            marges mb-6/mb-8 qu'avant pour ne pas resserrer la mise en page. */}
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
            {topVentesProducts.map(({ product: p, source }) => {
              const img = p.image_url
                ? getCloudinaryUrl(p.image_url, { width: 400, height: 400, crop: 'fill', format: 'auto', quality: 'auto' })
                : null;
              const sourceMeta = TOP_VENTES_SOURCES.find((s) => s.key === source);
              return (
                <Link
                  key={p.id}
                  href={`/${p.slug}`}
                  className="bg-white border border-site-border rounded-xl p-4 flex flex-col gap-2 hover:border-site-secondary hover:shadow-md transition-all hover:-translate-y-0.5 group"
                >
                  <div className="h-40 relative bg-site-bg rounded-lg overflow-hidden flex-shrink-0">
                    {img ? (
                      <Image
                        src={img}
                        alt={p.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized={img.includes('/fetch/')}
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-site-border">📦</div>
                    )}
                  </div>
                  {/* Étiquette plateforme (source réelle, déduite de
                      l'URL affiliée) — pas de mention "Best-seller / Promo /
                      Livraison rapide" comme sur la maquette : ce sont des
                      affirmations non vérifiées pour des vrais produits
                      vendus à de vrais clients. */}
                  {sourceMeta && (
                    <span className="text-xs text-site-text-secondary">{sourceMeta.label}</span>
                  )}
                  <p className="text-[15px] font-semibold text-site-text line-clamp-2 leading-snug">
                    {p.hero_title || p.name}
                  </p>
                  {p.price ? (
                    <span className="text-site-cta font-bold text-base">{p.price.toFixed(2)} €</span>
                  ) : (
                    <span className="text-site-text-secondary text-xs">{t.common.priceAtMerchant}</span>
                  )}
                </Link>
              );
            })}
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
            {featured.map((p) => {
              const img = p.image_url
                ? getCloudinaryUrl(p.image_url, { width: 400, height: 400, crop: 'fill', format: 'auto', quality: 'auto' })
                : null;
              const sourceMeta = TOP_VENTES_SOURCES.find((s) => s.key === getProductSource(p.affiliate_url));
              return (
                <Link
                  key={p.id}
                  href={`/${p.slug}`}
                  className="bg-white border border-site-border rounded-xl p-4 flex flex-col gap-2 hover:border-site-secondary hover:shadow-md transition-all hover:-translate-y-0.5 group"
                >
                  <div className="h-40 relative bg-site-bg rounded-lg overflow-hidden flex-shrink-0">
                    {img ? (
                      <Image
                        src={img}
                        alt={p.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized={img.includes('/fetch/')}
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-site-border">📦</div>
                    )}
                  </div>
                  {sourceMeta && (
                    <span className="text-xs text-site-text-secondary">{sourceMeta.label}</span>
                  )}
                  <p className="text-[15px] font-semibold text-site-text line-clamp-2 leading-snug">
                    {p.hero_title || p.name}
                  </p>
                  {p.price ? (
                    <span className="text-site-cta font-bold text-base">{p.price.toFixed(2)} €</span>
                  ) : (
                    <span className="text-site-text-secondary text-xs">{t.common.priceAtMerchant}</span>
                  )}
                </Link>
              );
            })}
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
          l'icône propres à chaque catégorie de blog. */}
      {blogCategories.length > 0 && (
        <section className="bg-white px-4 sm:px-16 py-16 flex flex-col gap-6">
          <h2 className="max-w-6xl mx-auto w-full text-2xl sm:text-[28px] font-bold text-site-text">
            {t.home.exploreByCategory}
          </h2>
          <div className="max-w-6xl mx-auto w-full grid grid-cols-2 sm:grid-cols-4 gap-6">
            {blogCategories.map((c) => (
              <Link
                key={c.id}
                href={`/blog?category=${encodeURIComponent(c.slug)}`}
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
                <span className="text-lg font-bold text-site-text">{c.name_fr}</span>
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
                    {post.cover_image_url ? (
                      <Image src={post.cover_image_url} alt={t.home.blogImageAlt} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      t.home.blogImageAlt
                    )}
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
      <CookieConsent market={market} />
      <PixelInjector
        pixelMeta={process.env.SITE_PIXEL_META}
        pixelTiktok={process.env.SITE_PIXEL_TIKTOK}
        pixelGtm={process.env.SITE_PIXEL_GTM}
      />
    </div>
  );
}
