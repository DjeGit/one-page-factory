'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { categoryPath } from '@/lib/category-slugs';
import { Menu, X, Search, ShoppingCart } from 'lucide-react';
import type { Category } from '@/types';
import type { Market } from '@/lib/market';
import { SITE_COPY } from '@/lib/site-copy';

interface Props {
  categories: Category[];
  market: Market;
}

function categoryName(c: Category, market: Market): string {
  if (market === 'es') return c.name_es;
  if (market === 'uk') return c.name_uk;
  return c.name_fr;
}

// Logo (03/10, demande Jerome) : piste "B/02" retenue parmi les 20
// propositions soumises en review — deux cercles qui se recoupent
// (navy + orange), symbolisant l'intersection entre "ce qui existe" et
// "ce qu'on retient". Volontairement plus affirmé que le reste du menu
// (taille et poids supérieurs, seul élément bicolore du header) pour que
// le repère de marque reste le premier point d'accroche visuel.
function LogoMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 sm:h-[4.5rem] sm:w-[4.5rem] shrink-0" aria-hidden="true">
      <circle cx="17" cy="24" r="13" className="fill-site-primary" opacity="0.94" />
      <circle cx="31" cy="24" r="13" className="fill-site-cta" opacity="0.94" />
    </svg>
  );
}

export default function SiteHeader({ categories, market }: Props) {
  // Traduction du chrome header (03/10, demande Jerome : "le menu Top
  // Ventes doit être modifié" — c'était la seule chaîne du header non
  // localisée, le reste (noms de catégories) vient déjà de la DB par
  // marché). Voir lib/site-copy.ts pour le dictionnaire complet.
  const t = SITE_COPY[market];
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    router.push(q ? `/produits?q=${encodeURIComponent(q)}` : '/produits');
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-site-border">
      <div className="w-full px-4 sm:px-6 lg:px-10 min-h-[3.5rem] py-1.5 lg:pt-3 lg:pb-7 flex items-center justify-between gap-4">
        <Link
          href="/"
          aria-label={t.nav.homeAria}
          className="flex items-center gap-3 shrink-0"
        >
          <LogoMark />
          <span className="font-extrabold text-4xl sm:text-5xl leading-none tracking-tight text-site-primary lowercase">
            tendpick
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-5 shrink-0 relative ml-auto">
          <Link href="/guide-achat" className="text-[15px] font-semibold text-site-text hover:text-site-cta transition-colors whitespace-nowrap">
            {t.nav.buyingGuide}
          </Link>
          <Link href="/blog" className="text-[15px] font-semibold text-site-text hover:text-site-cta transition-colors whitespace-nowrap">
            {t.nav.blog}
          </Link>
          {searchOpen ? (
            <form onSubmit={submitSearch} className="flex items-center">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setSearchOpen(false)}
                onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
                placeholder={t.nav.searchPlaceholder}
                aria-label={t.nav.searchAria}
                enterKeyHint="search"
                className="w-52 border border-site-border rounded-lg px-3 py-2 text-sm text-site-text focus:outline-none focus:ring-2 focus:ring-site-secondary/40"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="text-site-text hover:text-site-primary transition-colors"
              aria-label={t.nav.searchAria}
            >
              <Search className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
          {/* Panier (30/09) : visuel conforme à la maquette, pas encore
              fonctionnel. Le badge affiche honnêtement "0" — pas une donnée
              inventée : aucun produit n'est encore vendu en direct (tous les
              produits sont en affiliation aujourd'hui), le panier n'agrégera
              que des produits en mode "direct" une fois ce mode activé. */}
          <button
            type="button"
            aria-label={t.nav.cartAria(0)}
            className="relative text-site-text hover:text-site-primary transition-colors"
            title={t.nav.cartTitle}
          >
            <ShoppingCart className="w-5 h-5" aria-hidden="true" />
            <span aria-hidden="true" className="absolute -top-1.5 -right-2 bg-site-cta text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              0
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="lg:hidden p-2 -mr-2 text-site-text"
          aria-label={t.nav.menuAria}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {mobileOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
        </button>
      </div>

      {/* Menu des catégories : UNE SEULE ligne, sur toute la largeur du site (demande Jerome, 11/2026).
          Mêmes marges que la première ligne : le logo est aligné sur le début du menu, le panier sur sa fin.
          Les entrées se répartissent sur la largeur ; si l'écran est trop étroit, la ligne défile au lieu de passer à la ligne. */}
      <div className="hidden lg:block border-t border-site-border">
        <nav
          aria-label={t.nav.menuAria}
          className="flex w-full flex-nowrap items-center justify-between gap-x-6 overflow-x-auto px-4 sm:px-6 lg:px-10 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((c) => (
            <Link
              key={c.id}
              href={categoryPath(c.slug, market)}
              className="text-base xl:text-[18px] text-site-text hover:text-site-cta transition-colors whitespace-nowrap shrink-0"
            >
              {categoryName(c, market)}
            </Link>
          ))}
        </nav>
      </div>

      {mobileOpen && (
        <div id="mobile-menu" className="lg:hidden border-t border-site-border bg-white max-h-[75vh] overflow-y-auto">
          <div className="px-4 py-4 flex flex-col gap-1">
            <form
              onSubmit={(e) => {
                submitSearch(e);
                setMobileOpen(false);
              }}
              className="relative mb-2"
            >
              <Search className="w-4 h-4 text-site-text-secondary absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.nav.searchPlaceholder}
                aria-label={t.nav.searchAria}
                enterKeyHint="search"
                className="w-full border border-site-border rounded-lg pl-9 pr-3 py-2.5 text-base text-site-text focus:outline-none focus:ring-2 focus:ring-site-secondary/40"
              />
            </form>
            <div>
              <p className="px-2 pb-1 text-xs font-semibold text-site-text-secondary uppercase tracking-wide">{t.nav.categoriesLabel}</p>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={categoryPath(c.slug, market)}
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-2.5 text-sm text-site-text rounded-lg hover:bg-site-bg"
                >
                  {categoryName(c, market)}
                </Link>
              ))}
            </div>

            <Link
              href="/guide-achat"
              onClick={() => setMobileOpen(false)}
              className="mt-2 pt-2 border-t border-site-border block px-2 py-2.5 text-sm font-semibold text-site-text rounded-lg hover:bg-site-bg"
            >
              {t.nav.buyingGuide}
            </Link>
            <Link
              href="/blog"
              onClick={() => setMobileOpen(false)}
              className="block px-2 py-2.5 text-sm font-semibold text-site-text rounded-lg hover:bg-site-bg"
            >
              {t.nav.blog}
            </Link>

            <div className="mt-2 pt-2 border-t border-site-border flex items-center justify-between px-2 py-2.5 text-sm text-site-text-secondary">
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                {t.nav.cartLabel}
              </span>
              <span>{t.nav.itemCount(0)}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
