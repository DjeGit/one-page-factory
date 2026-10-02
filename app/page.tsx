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
import { TOP_VENTES_SOURCES, getProductSource, type TopVentesSource } from '@/lib/top-ventes';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { source?: string };
}

function categoryName(c: { name_fr: string; name_es: string; name_uk: string }, market: Market): string {
  if (market === 'es') return c.name_es;
  if (market === 'uk') return c.name_uk;
  return c.name_fr;
}

// Descriptions courtes par catégorie (section "Explorer par catégorie",
// design validé 30/09) — copie éditoriale, pas une donnée produit, donc pas
// de souci de véracité à vérifier contrairement aux notes/avis. Clé = slug
// (supabase/migrations/20260923000001_categories.sql). Reprend au mot près
// les 4 descriptions déjà rédigées dans la maquette Design.html pour les
// catégories communes ; complète les 4 autres dans le même esprit.
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'best-of-amazon': 'Les meilleures ventes Amazon du moment',
  tech: 'Objets connectés, audio, accessoires',
  'mode-beaute': 'Vêtements, accessoires, soins beauté',
  'maison-deco': 'Rangement, ambiance, petit électroménager',
  'sport-bien-etre': 'Fitness, plein air, relaxation',
  gaming: 'Jeux, streaming, paris sportifs',
  'art-design': 'Déco murale, papeterie, objets créatifs',
  loisirs: 'Jeux, hobbies, temps libre',
};

// Articles de blog (30/09) : Jerome a demandé de construire le DESIGN de la
// section blog maintenant ("on rajoutera les liens plus tard") — le blog
// lui-même (table blog_posts, pages /blog) n'existe pas encore, cf. Sprint 3
// du plan. Contenu placeholder assumé, liens desactivés (href="#") tant que
// les vraies pages n'existent pas — pas de lien mort affiché comme réel.
const BLOG_PLACEHOLDER = [
  {
    title: '5 accessoires tech qui changent le quotidien',
    excerpt: 'Sélection testée et comparée, avec nos coups de cœur du mois.',
  },
  {
    title: 'Aménager un coin bien-être chez soi',
    excerpt: 'Idées déco et petit budget pour un espace calme.',
  },
  {
    title: 'Le yoga à la maison : par où commencer',
    excerpt: 'Le matériel essentiel pour débuter sans se ruiner.',
  },
];

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
  const [featured, categories, topVentesPool] = await Promise.all([
    getFeaturedProducts(market),
    getActiveCategories(),
    getTopVentesPool(market),
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

      {/* Hero — demande Jerome du 02/10 (2 captures à l'appui) : garder le
          cadre actuel (bandeau navy plein largeur) mais y remettre le texte
          et les CTA de l'ancienne version, centrés dans le bandeau. */}
      <section className="bg-site-primary px-6 py-14 sm:py-20 flex flex-col items-center text-center gap-2">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/80 mb-4">
          <span className="w-2 h-2 rounded-full bg-site-cta animate-pulse" />
          Sélection mise à jour chaque semaine
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4 leading-tight text-white max-w-3xl">
          Les meilleurs produits <span className="text-site-cta">du moment</span>
        </h1>
        <p className="text-lg sm:text-xl text-white/70 max-w-2xl mb-8">
          Nous analysons les meilleures ventes en ligne pour vous présenter
          uniquement les produits qui valent vraiment votre attention — avec une
          fiche complète pour chaque article.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/produits"
            className="bg-site-cta hover:bg-site-cta-hover transition-colors px-7 py-3.5 rounded-lg font-semibold text-base text-white shadow-sm"
          >
            Découvrir les produits →
          </Link>
          <Link
            href="/top-ventes"
            className="text-white/70 hover:text-white transition-colors text-sm underline underline-offset-4"
          >
            Voir le Top Ventes
          </Link>
        </div>
      </section>

      {/* Top Ventes — design bleu validé (Design.html) : onglets par plateforme
          + grille de vrais produits (pas de notes/étoiles ni badges fictifs :
          aucun champ de note existe sur Product, cf. précédent du code qui a
          justement retiré ces signaux de confiance factices ailleurs). */}
      <section id="top-ventes" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-site-primary mb-6">Top Ventes</h2>

        <div className="flex flex-wrap gap-2 mb-8">
          {TOP_VENTES_SOURCES.map((s) => (
            <Link
              key={s.key}
              href={`/?source=${s.key}#top-ventes`}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                activeSource === s.key
                  ? 'bg-site-primary border-site-primary text-white'
                  : 'border-site-border text-site-text-secondary hover:text-site-primary hover:border-site-secondary'
              }`}
            >
              <span>{s.icon}</span>
              {s.label}
            </Link>
          ))}
        </div>

        {topVentesProducts.length === 0 ? (
          <p className="text-site-text-secondary">Sélection en cours de préparation pour cette plateforme.</p>
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
                    <span className="text-site-text-secondary text-xs">Prix chez le marchand</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/top-ventes" className="text-site-secondary hover:text-site-primary font-medium transition-colors">
            Voir tout le Top Ventes →
          </Link>
        </div>
      </section>

      {/* Explorer par catégorie — design validé (Design.html) : fond bleu
          clair, pastille pleine couleur (pas d'icône/emoji dans la
          pastille, la maquette n'en montre pas). */}
      {categories.length > 0 && (
        <section className="bg-white px-4 sm:px-16 py-16 flex flex-col gap-6">
          <h2 className="max-w-6xl mx-auto w-full text-2xl sm:text-[28px] font-bold text-site-text">
            Explorer par catégorie
          </h2>
          <div className="max-w-6xl mx-auto w-full grid grid-cols-2 sm:grid-cols-4 gap-6">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="bg-[#EAF2FB] rounded-2xl p-8 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                <span className="w-12 h-12 rounded-full bg-site-secondary" />
                <span className="text-lg font-bold text-site-text">{categoryName(c, market)}</span>
                <span className="text-[13px] text-site-text-secondary">
                  {CATEGORY_DESCRIPTIONS[c.slug] || 'Notre sélection dans cette catégorie'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <h2 className="text-xl font-bold text-site-primary mb-6">Sélection du moment</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {featured.map((p) => {
              const img = p.image_url
                ? getCloudinaryUrl(p.image_url, { width: 400, height: 400, crop: 'fill', format: 'auto', quality: 'auto' })
                : null;
              return (
                <Link
                  key={p.id}
                  href={`/${p.slug}`}
                  className="bg-white border border-site-border rounded-xl overflow-hidden hover:border-site-secondary hover:shadow-md transition-all hover:-translate-y-0.5 group"
                >
                  <div className="aspect-square relative bg-site-bg">
                    {img ? (
                      <Image
                        src={img}
                        alt={p.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized={img.includes('/fetch/')}
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-site-border">📦</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-site-text line-clamp-2 leading-snug mb-1">
                      {p.hero_title || p.name}
                    </p>
                    {p.price && (
                      <p className="text-site-cta font-bold text-sm">{p.price.toFixed(2)} €</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          {featured.length >= 6 && (
            <div className="text-center mt-8">
              <Link href="/produits" className="text-site-secondary hover:text-site-primary font-medium transition-colors">
                Voir tous les produits →
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Comment ça marche */}
      <section id="comment" className="bg-white border-y border-site-border py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-12 text-site-primary">Comment ça marche</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { emoji: '🔍', title: 'On analyse', desc: 'Chaque semaine, nous passons en revue les meilleures ventes en ligne pour trouver les produits les plus populaires et les mieux notés.' },
              { emoji: '✍️', title: 'On rédige', desc: 'Pour chaque produit, nous créons une fiche complète : avantages clés, FAQ, avis clients et conseils d\'achat pour vous aider à décider.' },
              { emoji: '🛒', title: 'Vous achetez', desc: 'Un clic sur le bouton vous emmène directement chez le marchand, en toute sécurité, au meilleur prix disponible.' },
            ].map((s) => (
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

      {/* Depuis le blog — design construit maintenant (30/09), contenu et
          liens réels à brancher au Sprint 3 (cf. plan de refonte : le blog
          reprend les catégories produit comme univers éditoriaux). Les
          cartes ne sont volontairement pas cliquables ("Lire l'article"
          n'a pas de href) tant que les pages n'existent pas vraiment. */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-6">
        <h2 className="text-2xl sm:text-[28px] font-bold text-site-text">Depuis le blog</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {BLOG_PLACEHOLDER.map((post) => (
            <div key={post.title} className="flex flex-col gap-2">
              <div className="h-36 bg-site-bg border border-site-border rounded-lg flex items-center justify-center text-site-text-secondary text-sm">
                Image article
              </div>
              <span className="text-base font-bold text-site-text">{post.title}</span>
              <span className="text-[13px] text-site-text-secondary">{post.excerpt}</span>
              <span className="text-[13px] font-semibold text-site-text-secondary cursor-default">
                Lire l&apos;article → <span className="italic font-normal">(bientôt)</span>
              </span>
            </div>
          ))}
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
