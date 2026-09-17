import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Product } from '@/types';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catalogue produits — Tendpick',
  description: 'Découvrez tous les produits sélectionnés par Tendpick : les meilleures ventes Amazon avec des fiches détaillées.',
};

async function getAllActive(): Promise<Product[]> {
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from('products')
      .select('*')
      .eq('active', true)
      .order('updated_at', { ascending: false });
    return (data as Product[]) || [];
  } catch {
    return [];
  }
}

export default async function ProduitsPage() {
  const products = await getAllActive();

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
            <span className="text-sm text-violet-400 font-medium hidden sm:block">Catalogue</span>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">
            Notre sélection
          </h1>
          <p className="text-gray-400">
            {products.length > 0
              ? `${products.length} produit${products.length > 1 ? 's' : ''} sélectionné${products.length > 1 ? 's' : ''} — mis à jour chaque semaine`
              : 'Nouveaux produits bientôt disponibles'}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-lg">Première sélection en cours de préparation…</p>
            <p className="text-sm mt-2">Revenez dans quelques heures !</p>
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
