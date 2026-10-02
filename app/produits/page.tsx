import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseAdmin, getActiveCategories } from '@/lib/supabase';
import type { Product } from '@/types';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getMarketFromHost } from '@/lib/market-from-host';
import type { Market } from '@/lib/market';
import CookieConsent from '@/components/layout/CookieConsent';
import PixelInjector from '@/components/landing/PixelInjector';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { getProductSource, TOP_VENTES_SOURCES } from '@/lib/top-ventes';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catalogue produits — Tendpick',
  description: 'Découvrez tous les produits sélectionnés par Tendpick : les meilleures ventes en ligne avec des fiches détaillées.',
};

interface Props {
  searchParams: { q?: string };
}

function categoryName(c: { name_fr: string; name_es: string; name_uk: string }, market: Market): string {
  if (market === 'es') return c.name_es;
  if (market === 'uk') return c.name_uk;
  return c.name_fr;
}

async function getAllActive(market: Market, query?: string): Promise<Product[]> {
  try {
    const sb = getSupabaseAdmin();
    let q = sb
      .from('products')
      .select('*')
      .eq('active', true)
      .eq('market', market);
    // Recherche (icône loupe du header, 30/09) : simple ILIKE sur le nom
    // et le titre affiché, pas de moteur de recherche dédié pour l'instant.
    if (query) {
      q = q.or(`name.ilike.%${query}%,hero_title.ilike.%${query}%`);
    }
    const { data } = await q.order('updated_at', { ascending: false });
    return (data as Product[]) || [];
  } catch {
    return [];
  }
}

export default async function ProduitsPage({ searchParams }: Props) {
  // Marché déduit du domaine (pas de produit unique sur cette page),
  // même logique que app/layout.tsx (lib/market-from-host.ts).
  const market = getMarketFromHost(headers().get('host'));
  const query = searchParams.q?.trim() || undefined;
  const [products, categories] = await Promise.all([getAllActive(market, query), getActiveCategories()]);

  return (
    <div className="min-h-screen bg-site-bg text-site-text">
      <SiteHeader categories={categories} market={market} />

      {/* La rangée de pastilles catégories (avec icônes) sous le header a
          été retirée (02/10, demande Jerome) : les catégories sont déjà
          accessibles depuis le menu, doublon inutile. */}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 text-site-primary">
            {query ? `Résultats pour « ${query} »` : 'Notre sélection'}
          </h1>
          <p className="text-site-text-secondary">
            {products.length > 0
              ? `${products.length} produit${products.length > 1 ? 's' : ''} sélectionné${products.length > 1 ? 's' : ''} — mis à jour chaque semaine`
              : query
              ? 'Aucun produit ne correspond à cette recherche'
              : 'Nouveaux produits bientôt disponibles'}
          </p>
          {query && (
            <Link href="/produits" className="inline-block mt-2 text-sm text-site-secondary hover:text-site-primary transition-colors">
              ← Voir tout le catalogue
            </Link>
          )}
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24 text-site-text-secondary">
            <div className="text-5xl mb-4">📦</div>
            {query ? (
              <p className="text-lg">Rien ne correspond à « {query} ».</p>
            ) : (
              <>
                <p className="text-lg">Première sélection en cours de préparation…</p>
                <p className="text-sm mt-2">Revenez dans quelques heures !</p>
              </>
            )}
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
                        <span className="text-site-text-secondary text-xs">Prix chez le marchand</span>
                      )}
                      <span className="text-xs text-site-text-secondary group-hover:text-site-secondary transition-colors">
                        Voir →
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

      <CookieConsent market={market} />
      <PixelInjector
        pixelMeta={process.env.SITE_PIXEL_META}
        pixelTiktok={process.env.SITE_PIXEL_TIKTOK}
        pixelGtm={process.env.SITE_PIXEL_GTM}
      />
    </div>
  );
}
