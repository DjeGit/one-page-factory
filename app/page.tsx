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

      {/* Hero — design bleu validé (Design.html) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <div className="bg-site-primary rounded-2xl px-6 sm:px-12 py-14 sm:py-20">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-white/50 mb-4">
            Comparateur multi-plateformes
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-5 leading-tight text-white max-w-2xl">
            Les meilleures ventes tendance, comparées pour vous
          </h1>
          <p className="text-base sm:text-lg text-white/70 max-w-xl mb-8">
            Amazon, Rakuten, AliExpress et bientôt d&apos;autres sources — un seul
            endroit pour comparer avant d&apos;acheter.
          </p>
          <Link
            href="/top-ventes"
            className="inline-flex items-center gap-2 bg-site-cta hover:bg-site-cta-hover transition-colors px-6 py-3 rounded-xl font-semibold text-sm sm:text-base text-white shadow-sm"
          >
            Découvrir le Top Ventes
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {topVentesProducts.map(({ product: p, source }) => {
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
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-site-border">📦</div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    {sourceMeta && (
                      <span className="text-xs text-site-text-secondary flex items-center gap-1">
                        <span>{sourceMeta.icon}</span>
                        {sourceMeta.label}
                      </span>
                    )}
                    <p className="text-sm font-medium text-site-text line-clamp-2 leading-snug flex-1">
                      {p.hero_title || p.name}
                    </p>
                    {p.price ? (
                      <span className="text-site-cta font-bold text-sm">{p.price.toFixed(2)} €</span>
                    ) : (
                      <span className="text-site-text-secondary text-xs">Prix chez le marchand</span>
                    )}
                  </div>
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

      {/* Categories grid */}
      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <h2 className="text-xl font-bold text-site-primary mb-6">Parcourir par catégorie</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="bg-white border border-site-border rounded-xl p-5 flex flex-col items-center gap-2 text-center hover:border-site-secondary hover:shadow-md transition-all"
              >
                <span className="text-3xl">{c.icon || '📦'}</span>
                <span className="text-sm font-medium text-site-text">{categoryName(c, market)}</span>
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

      {/* CTA final */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-site-primary">Prêt à découvrir nos coups de cœur ?</h2>
        <p className="text-site-text-secondary mb-8">Une sélection de produits mise à jour chaque semaine.</p>
        <Link
          href="/produits"
          className="inline-flex items-center gap-2 bg-site-cta hover:bg-site-cta-hover transition-colors px-8 py-3.5 rounded-xl font-semibold text-base text-white shadow-sm"
        >
          Voir tous les produits →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-site-border bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-site-text-secondary">
          <div className="flex items-center font-extrabold text-site-primary lowercase">
            tendpick
          </div>
          <div className="flex items-center gap-6">
            <Link href="/produits" className="hover:text-site-primary transition-colors">Catalogue</Link>
            <Link href="/top-ventes" className="hover:text-site-primary transition-colors">Top Ventes</Link>
            <Link href="/mentions-legales" className="hover:text-site-primary transition-colors">Mentions légales</Link>
            <Link href="/politique-confidentialite" className="hover:text-site-primary transition-colors">Confidentialité</Link>
          </div>
          <p>© {new Date().getFullYear()} Tendpick</p>
        </div>
      </footer>

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
