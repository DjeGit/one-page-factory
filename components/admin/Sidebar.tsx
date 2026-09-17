'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useMarket, MARKETS } from './MarketContext';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/admin/products', label: 'Produits', icon: '🛍️' },
  { href: '/admin/market', label: 'Étude de marché', icon: '🔍' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
  { href: '/admin/abtesting', label: 'A/B Testing', icon: '🧪' },
  { href: '/admin/leads', label: 'Leads', icon: '👥' },
  { href: '/admin/design', label: 'Design', icon: '🎨' },
  { href: '/admin/tiktok', label: 'Diffusion', icon: '📡' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { market, setMarket, currentMarket } = useMarket();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ferme le dropdown si clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col min-h-screen flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white tracking-tight">
          One Page Factory
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Back Office Admin</p>
      </div>

      {/* ─── Sélecteur PAYS ─── */}
      <div className="px-4 py-4 border-b border-gray-700 bg-gray-800/50">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          PAYS
        </p>
        <div className="relative" ref={dropdownRef}>
          {/* Bouton trigger */}
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-xl px-3 py-2.5 border border-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <span className="text-lg leading-none">{currentMarket.flag}</span>
              <span>{currentMarket.name}</span>
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-50 overflow-hidden">
              {MARKETS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setMarket(m.id); setDropdownOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left ${
                    market === m.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <span className="text-lg leading-none">{m.flag}</span>
                  <div>
                    <div className="font-medium leading-tight">{m.name}</div>
                    <div className="text-xs opacity-60 leading-tight">{m.amazon}</div>
                  </div>
                  {market === m.id && (
                    <svg className="ml-auto w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
              {/* Séparateur + futur "Ajouter un pays" */}
              <div className="border-t border-gray-700 px-3 py-2">
                <p className="text-xs text-gray-500 text-center">
                  Italie, Allemagne... bientôt disponibles
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Infos marché actif */}
        <p className="text-xs text-gray-400 mt-2 text-center leading-tight">
          {currentMarket.amazon} · {currentMarket.currency}
        </p>
      </div>

      {/* ─── Navigation ─── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive(item.href, item.exact)
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-300 hover:bg-gray-700/80 hover:text-white'
            }`}
          >
            <span className="text-base w-5 text-center flex-shrink-0">
              {item.icon}
            </span>
            <span>{item.label}</span>
            {isActive(item.href, item.exact) && item.href !== '/admin' && (
              <span className="ml-auto text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                {currentMarket.flag}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* ─── Footer ─── */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span>Admin connecté</span>
        </div>
        <Link
          href="/api/auth/logout"
          className="block w-full text-center py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          Déconnexion
        </Link>
      </div>
    </div>
  );
}
