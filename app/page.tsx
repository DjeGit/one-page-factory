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

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { source?: string };
}

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

      {/* Hero — remplacé le 03/10 par un carrousel (demande Jerome, après
          revue de 10 propositions de bannières) : 4 angles retenus
          (bannières 1/3/6/10 de la proposition), décor fixe repris de la
          bannière 5, seul le texte change en fondu. Voir
          components/landing/HeroCarousel.tsx pour le détail et le
          raisonnement. */}
      <HeroCarousel />

      {/* Top Ventes — design bleu validé (Design.html) : onglets par plateforme
          + grille de vrais produits (pas de notes/étoiles ni badges fictifs :
          aucun champ de note existe sur Product, cf. précédent du code qui a
          justement retiré ces signaux de confiance factices ailleurs). */}
      <section id="top-ventes" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        {/* Titres de section (03/10, demande Jerome) : même format/taille sur
            Top Ventes, Sélection du moment et Depuis le blog — petit kicker
            orange en majuscules au-dessus d'un titre navy, plus marqué que
            le simple h2 bold d'avant. */}
        <div className="mb-6 sm:mb-8">
          <span className="block text-xs font-bold uppercase tracking-wider text-site-cta mb-1">Classement</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-site-primary">Top Ventes</h2>
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
              Top {s.label}
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

      {/* Sélection du moment — repositionnée juste sous Top Ventes et alignée
          sur son format exact (03/10, demande Jerome) : même grille 4
          colonnes, même carte produit (étiquette plateforme texte, pas de
          badge sur l'image), même style de titre. L'ancienne version 3
          colonnes/carte simplifiée est abandonnée au profit de la
          cohérence entre les deux sections produits de la page. */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="mb-6 sm:mb-8">
            <span className="block text-xs font-bold uppercase tracking-wider text-site-cta mb-1">Fraîchement ajouté</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-site-primary">Sélection du moment</h2>
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
                    <span className="text-site-text-secondary text-xs">Prix chez le marchand</span>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <Link href="/produits" className="text-site-secondary hover:text-site-primary font-medium transition-colors">
              Voir tous les produits →
            </Link>
          </div>
        </section>
      )}

      {/* Depuis le blog — déplacée ici (03/10, demande Jerome) : prend la
          place de l'ancienne section "Explorer par catégorie" (retirée,
          doublon du menu), juste après les deux sections produits. Contenu
          et liens réels à brancher au Sprint 3 (cf. plan de refonte) ; les
          cartes ne sont volontairement pas cliquables ("Lire l'article" n'a
          pas de href) tant que les pages n'existent pas vraiment. */}
      <section className="bg-white border-y border-site-border px-4 sm:px-6 py-16">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-site-cta mb-1">Nos conseils</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-site-primary">Depuis le blog</h2>
          </div>
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
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment" className="py-20">
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
