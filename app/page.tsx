import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Product } from '@/types';
import { getCloudinaryUrl } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from('products')
      .select('*')
      .eq('active', true)
      .order('updated_at', { ascending: false })
      .limit(6);
    return (data as Product[]) || [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featured = await getFeaturedProducts();

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Navigation ─────────────────────────────────────────── */}
      <header className="border-b border-white/10 sticky top-0 z-50 bg-gray-950/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <span className="text-2xl">⚡</span>
            <span className="bg-gradient-to-r from-violet-400 to-amber-400 bg-clip-text text-transparent">
              Tendpick
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/produits" className="text-sm text-gray-300 hover:text-white transition-colors hidden sm:block">
              Catalogue
            </Link>
            <Link
              href="/produits"
              className="text-sm bg-violet-600 hover:bg-violet-500 transition-colors px-4 py-2 rounded-lg font-medium"
            >
              Voir les produits
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-950/60 border border-violet-500/30 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-6">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          Sélection mise à jour chaque semaine
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Les meilleurs produits{' '}
          <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
            du moment
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Nous analysons les meilleures ventes Amazon pour vous présenter uniquement
          les produits qui valent vraiment votre attention — avec une fiche complète
          pour chaque article.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/produits"
            className="bg-violet-600 hover:bg-violet-500 transition-colors px-8 py-3.5 rounded-xl font-semibold text-base w-full sm:w-auto text-center"
          >
            Découvrir les produits →
          </Link>
          <a
            href="#comment"
            className="text-gray-400 hover:text-white transition-colors text-sm underline underline-offset-4"
          >
            Comment ça marche ?
          </a>
        </div>
      </section>

      {/* ── Featured products ──────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <h2 className="text-xl font-bold text-gray-200 mb-6">Sélection du moment</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {featured.map((p) => {
              const img = p.image_url
                ? getCloudinaryUrl(p.image_url, { width: 400, height: 400, crop: 'fill', format: 'auto', quality: 'auto' })
                : null;
              return (
                <Link
                  key={p.id}
                  href={`/${p.slug}`}
                  className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden hover:border-violet-500/50 transition-all hover:-translate-y-0.5 group"
                >
                  <div className="aspect-square relative bg-gray-800">
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
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">📦</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-200 line-clamp-2 leading-snug mb-1">
                      {p.hero_title || p.name}
                    </p>
                    {p.price && (
                      <p className="text-violet-400 font-bold text-sm">{p.price.toFixed(2)} €</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          {featured.length >= 6 && (
            <div className="text-center mt-8">
              <Link href="/produits" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Voir tous les produits →
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ── Comment ça marche ──────────────────────────────────── */}
      <section id="comment" className="bg-gray-900/50 border-y border-white/5 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-12">Comment ça marche</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { emoji: '🔍', title: 'On analyse', desc: 'Chaque semaine, nous passons en revue les meilleures ventes Amazon pour trouver les produits les plus populaires et les mieux notés.' },
              { emoji: '✍️', title: 'On rédige', desc: 'Pour chaque produit, nous créons une fiche complète : avantages clés, FAQ, avis clients et conseils d\'achat pour vous aider à décider.' },
              { emoji: '🛒', title: 'Vous achetez', desc: 'Un clic sur le bouton vous emmène directement sur Amazon. Prix Amazon garanti, livraison Prime disponible, retours facilités.' },
            ].map((s) => (
              <div key={s.title} className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-violet-950/60 border border-violet-500/30 flex items-center justify-center text-3xl">
                  {s.emoji}
                </div>
                <h3 className="font-bold text-lg">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Prêt à découvrir nos coups de cœur ?</h2>
        <p className="text-gray-400 mb-8">Une sélection de produits mise à jour chaque semaine.</p>
        <Link
          href="/produits"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 transition-all px-8 py-3.5 rounded-xl font-semibold text-base"
        >
          Voir tous les produits →
        </Link>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>⚡</span>
            <span className="font-semibold text-gray-400">Tendpick</span>
            <span>— Sélection de produits Amazon</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/produits" className="hover:text-gray-300 transition-colors">Catalogue</Link>
            <Link href="/mentions-legales" className="hover:text-gray-300 transition-colors">Mentions légales</Link>
            <Link href="/politique-confidentialite" className="hover:text-gray-300 transition-colors">Confidentialité</Link>
          </div>
          <p>© {new Date().getFullYear()} Tendpick</p>
        </div>
      </footer>
    </div>
  );
}
