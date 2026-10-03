'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, Search, ShoppingCart } from 'lucide-react';
import type { Category } from '@/types';
import type { Market } from '@/lib/market';
import { TOP_VENTES_SOURCES } from '@/lib/top-ventes';
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
    <svg viewBox="0 0 48 48" className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" aria-hidden="true">
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
  const [topVentesOpen, setTopVentesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const topVentesRef = useRef<HTMLDivElement>(null);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    router.push(q ? `/produits?q=${encodeURIComponent(q)}` : '/produits');
  }

  // Menu déroulant "Top Ventes" (30/09) : au clic plutôt qu'au survol (plus
  // fiable au trackpad/tactile), fermeture au clic extérieur ou sur Échap.
  // Le bug remonté par Jerome ("le menu déroulant ne fonctionne pas") venait
  // de overflow-x-auto sur <nav> : poser overflow-x seul sans overflow-y fait
  // retomber overflow-y sur "auto" côté navigateur, ce qui rognait le panneau
  // en position absolute qui dépasse verticalement — nav n'a plus besoin de
  // scroll horizontal (6 entrées fixes tiennent sur 1440px), on l'a retiré.
  useEffect(() => {
    if (!topVentesOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (topVentesRef.current && !topVentesRef.current.contains(e.target as Node)) {
        setTopVentesOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setTopVentesOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [topVentesOpen]);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-site-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          aria-label={t.nav.homeAria}
          className="flex items-center gap-2 shrink-0 -ml-1 sm:-ml-1.5"
        >
          <LogoMark />
          <span className="font-extrabold text-2xl leading-none tracking-tight text-site-primary lowercase">
            tendpick
          </span>
        </Link>

        {/* Nav — design validé (Design.html) : pas d'icônes sur les liens,
            pas de chevron sur Top Ventes. */}
        <nav className="hidden md:flex items-center gap-8">
          <div className="relative shrink-0" ref={topVentesRef}>
            <button
              type="button"
              onClick={() => setTopVentesOpen((v) => !v)}
              aria-expanded={topVentesOpen}
              className="text-[15px] font-semibold text-site-primary hover:text-site-secondary transition-colors whitespace-nowrap"
            >
              {t.nav.topVentes}
            </button>
            {topVentesOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-56 z-50">
                <div className="bg-white rounded-xl border border-site-border shadow-lg py-2">
                  <Link
                    href="/top-ventes"
                    onClick={() => setTopVentesOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-site-text hover:bg-site-bg transition-colors"
                  >
                    {t.nav.seeAll}
                  </Link>
                  <div className="my-1 border-t border-site-border" />
                  {TOP_VENTES_SOURCES.map((s) => (
                    <Link
                      key={s.key}
                      href={`/top-ventes?source=${s.key}`}
                      onClick={() => setTopVentesOpen(false)}
                      className="block px-4 py-2.5 text-sm text-site-text hover:bg-site-bg transition-colors"
                    >
                      {s.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.slug}`}
              className="text-[15px] text-site-text hover:text-site-primary transition-colors whitespace-nowrap shrink-0"
            >
              {categoryName(c, market)}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-5 shrink-0 relative">
          {searchOpen ? (
            <form onSubmit={submitSearch} className="flex items-center">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setSearchOpen(false)}
                placeholder={t.nav.searchPlaceholder}
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
              <Search className="w-5 h-5" />
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
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-2 bg-site-cta text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              0
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 -mr-2 text-site-text"
          aria-label={t.nav.menuAria}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-site-border bg-white max-h-[75vh] overflow-y-auto">
          <div className="px-4 py-4 flex flex-col gap-1">
            <form
              onSubmit={(e) => {
                submitSearch(e);
                setMobileOpen(false);
              }}
              className="relative mb-2"
            >
              <Search className="w-4 h-4 text-site-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.nav.searchPlaceholder}
                className="w-full border border-site-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-site-text focus:outline-none focus:ring-2 focus:ring-site-secondary/40"
              />
            </form>
            <p className="px-2 pb-1 text-xs font-semibold text-site-text-secondary uppercase tracking-wide">{t.nav.topVentes}</p>
            <Link href="/top-ventes" onClick={() => setMobileOpen(false)} className="px-2 py-2.5 text-sm font-medium text-site-text rounded-lg hover:bg-site-bg">
              {t.nav.seeAll}
            </Link>
            {TOP_VENTES_SOURCES.map((s) => (
              <Link
                key={s.key}
                href={`/top-ventes?source=${s.key}`}
                onClick={() => setMobileOpen(false)}
                className="px-2 py-2.5 text-sm text-site-text rounded-lg hover:bg-site-bg"
              >
                {s.label}
              </Link>
            ))}

            <div className="mt-2 pt-2 border-t border-site-border">
              <p className="px-2 pb-1 text-xs font-semibold text-site-text-secondary uppercase tracking-wide">{t.nav.categoriesLabel}</p>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/c/${c.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-2.5 text-sm text-site-text rounded-lg hover:bg-site-bg"
                >
                  {categoryName(c, market)}
                </Link>
              ))}
            </div>

            <div className="mt-2 pt-2 border-t border-site-border flex items-center justify-between px-2 py-2.5 text-sm text-site-text-secondary">
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
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
