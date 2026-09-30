'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronDown } from 'lucide-react';
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [topVentesOpen, setTopVentesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-site-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-xl tracking-tight text-site-primary shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-site-cta" />
          Tendpick
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

        <div className="hidden md:block shrink-0">
          <Link
            href="/produits"
            className="inline-flex items-center gap-2 bg-site-cta hover:bg-site-cta-hover text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            Voir le catalogue
          </Link>
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
