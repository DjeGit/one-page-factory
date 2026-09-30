'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, ChevronDown, Search } from 'lucide-react';
import type { Category } from '@/types';
import type { Market } from '@/lib/market';
import { TOP_VENTES_SOURCES } from '@/lib/top-ventes';

interface Props {
  categories: Category[];
  market: Market;
}

function categoryName(c: Category, market: Market): string {
  if (market === 'es') return c.name_es;
  if (market === 'uk') return c.name_uk;
  return c.name_fr;
}

export default function SiteHeader({ categories, market }: Props) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [topVentesOpen, setTopVentesOpen] = useState(false);
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center font-extrabold text-xl tracking-tight text-site-primary shrink-0 lowercase">
          tendpick
        </Link>

        <nav className="hidden md:flex items-center gap-5 overflow-x-auto">
          <div
            className="relative shrink-0"
            onMouseEnter={() => setTopVentesOpen(true)}
            onMouseLeave={() => setTopVentesOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-site-text hover:text-site-primary transition-colors whitespace-nowrap"
            >
              Top Ventes
              <ChevronDown className="w-4 h-4" />
            </button>
            {topVentesOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-56">
                <div className="bg-white rounded-xl border border-site-border shadow-lg py-2">
                  <Link
                    href="/top-ventes"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-site-text hover:bg-site-bg transition-colors"
                  >
                    Tout voir
                  </Link>
                  <div className="my-1 border-t border-site-border" />
                  {TOP_VENTES_SOURCES.map((s) => (
                    <Link
                      key={s.key}
                      href={`/top-ventes?source=${s.key}`}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-site-text hover:bg-site-bg transition-colors"
                    >
                      <span>{s.icon}</span>
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
              className="flex items-center gap-1.5 text-sm font-medium text-site-text hover:text-site-primary transition-colors whitespace-nowrap shrink-0"
            >
              <span>{c.icon || '📦'}</span>
              {categoryName(c, market)}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-1 shrink-0 relative">
          {searchOpen ? (
            <form onSubmit={submitSearch} className="flex items-center">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setSearchOpen(false)}
                placeholder="Rechercher un produit…"
                className="w-52 border border-site-border rounded-lg px-3 py-2 text-sm text-site-text focus:outline-none focus:ring-2 focus:ring-site-secondary/40"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-2 text-site-text hover:text-site-primary transition-colors"
              aria-label="Rechercher"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 -mr-2 text-site-text"
          aria-label="Menu"
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
                placeholder="Rechercher un produit…"
                className="w-full border border-site-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-site-text focus:outline-none focus:ring-2 focus:ring-site-secondary/40"
              />
            </form>
            <p className="px-2 pb-1 text-xs font-semibold text-site-text-secondary uppercase tracking-wide">Top Ventes</p>
            <Link href="/top-ventes" onClick={() => setMobileOpen(false)} className="px-2 py-2.5 text-sm font-medium text-site-text rounded-lg hover:bg-site-bg">
              Tout voir
            </Link>
            {TOP_VENTES_SOURCES.map((s) => (
              <Link
                key={s.key}
                href={`/top-ventes?source=${s.key}`}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-2 py-2.5 text-sm text-site-text rounded-lg hover:bg-site-bg"
              >
                <span>{s.icon}</span>
                {s.label}
              </Link>
            ))}

            <div className="mt-2 pt-2 border-t border-site-border">
              <p className="px-2 pb-1 text-xs font-semibold text-site-text-secondary uppercase tracking-wide">Catégories</p>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/c/${c.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-2 py-2.5 text-sm text-site-text rounded-lg hover:bg-site-bg"
                >
                  <span>{c.icon || '📦'}</span>
                  {categoryName(c, market)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
