import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getCategoryBySlug, getActiveProductsByCategory, getCategories } from '@/lib/supabase';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import { getMarketFromHost } from '@/lib/market-from-host';
import type { Metadata } from 'next';

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
    description: `Découvrez notre sélection ${name} sur Tendpick.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const host = headers().get('host');
  const market = getMarketFromHost(host);
  const [products, allCategories] = await Promise.all([
    getActiveProductsByCategory(category.id, market),
    getCategories(),
  ]);

  const name = categoryName(category, market);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <header className="border-b border-white/10 sticky top-0 z-50 bg-gray-950/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <span className="text-2xl">⚡</span>
            <span className="bg-gradient-to-r from-violet-400 to-amber-400 bg-clip-text text-transparent">Tendpick</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/produits" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">
              Catalogue
            </Link>
          </nav>
        </div>
      </header>

      {/* Category chips */}
      {allCategories.length > 1 && (
        <div className="border-b border-white/10 bg-gray-950/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap gap-2">
            {allCategories.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  c.slug === category.slug
                    ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                    : 'border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                }`}
              >
                {c.icon ? `${c.icon} ` : ''}
                {categoryName(c, market)}
              </Link>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">
            {category.icon ? `${category.icon} ` : ''}
            {name}
          </h1>
          <p className="text-gray-400">
            {products.length > 0
              ? `${products.length} produit${products.length > 1 ? 's' : ''} sélectionné${products.length > 1 ? 's' : ''}`
              : 'Nouveaux produits bientôt disponibles dans cette catégorie'}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <div className="text-5xl mb-4">{category.icon || '📦'}</div>
            <p className="text-lg">Sélection en cours de préparation…</p>
            <p className="text-sm mt-2">Revenez dans quelques jours !</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => {
              const img = p.image_url
                ? getCloudinaryUrl(p.image_url, { width: 400, height: 400, crop: 'fill', format: 'auto', quality: 'auto' })
                : null;
              return (
                <Link
                  key={p.id}
                  href={`/${p.slug}`}
                  className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden hover:border-violet-500/50 transition-all hover:-translate-y-0.5 group flex flex-col"
                >
                  <div className="aspect-square relative bg-gray-800 flex-shrink-0">
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
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">📦</div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <p className="text-sm font-medium text-gray-200 line-clamp-2 leading-snug flex-1">
                      {p.hero_title || p.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      {p.price ? (
                        <span className="text-violet-400 font-bold text-sm">{p.price.toFixed(2)} €</span>
                      ) : (
                        <span className="text-gray-500 text-xs">Prix sur Amazon</span>
                      )}
                      <span className="text-xs text-gray-500 group-hover:text-violet-400 transition-colors">
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

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <span>© {new Date().getFullYear()} Tendpick — Partenaire Amazon</span>
          <div className="flex gap-6">
            <Link href="/mentions-legales" className="hover:text-gray-300 transition-colors">Mentions légales</Link>
            <Link href="/politique-confidentialite" className="hover:text-gray-300 transition-colors">Confidentialité</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
