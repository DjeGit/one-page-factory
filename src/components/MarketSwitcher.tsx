'use client';

/**
 * ============================================================
 * MarketSwitcher — Dropdown sélection marché
 * Fichier : src/components/MarketSwitcher.tsx
 * ============================================================
 * Placer ce composant AU-DESSUS de la section Dashboard.
 * Il redirige automatiquement vers le bon domaine.
 * Pour ajouter un marché : ajouter dans markets.config.ts uniquement.
 * ============================================================
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ACTIVE_MARKETS, type Market, type MarketId } from '@/config/markets.config';

interface MarketSwitcherProps {
  /** Marché actuellement actif (passé depuis le Server Component parent) */
  currentMarketId: MarketId;
  /** Classe CSS supplémentaire */
  className?: string;
}

export function MarketSwitcher({ currentMarketId, className = '' }: MarketSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const currentMarket = ACTIVE_MARKETS.find((m) => m.id === currentMarketId) ?? ACTIVE_MARKETS[0];

  // Fermer si clic à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function navigateToMarket(market: Market) {
    setIsOpen(false);
    if (market.id === currentMarketId) return;

    // En production : redirige vers le bon domaine
    if (process.env.NODE_ENV === 'production') {
      const protocol = 'https';
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = `${protocol}://${market.domain}${currentPath}`;
    } else {
      // En dev : change juste le cookie et recharge
      document.cookie = `OPF_MARKET=${market.locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
      // Navigue vers la version dev (ex: es.localhost:3000)
      window.location.href = `http://${market.devDomain}${window.location.pathname}`;
    }
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Bouton trigger */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`
          flex items-center gap-2.5 px-4 py-2.5 rounded-xl
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          shadow-sm hover:shadow-md
          transition-all duration-200
          text-sm font-medium text-gray-700 dark:text-gray-200
          hover:border-blue-300 dark:hover:border-blue-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Sélectionner le marché"
      >
        {/* Drapeau + nom */}
        <span className="text-lg leading-none" role="img" aria-label={currentMarket.label}>
          {currentMarket.flag}
        </span>
        <span>{currentMarket.label}</span>
        <span className="text-xs text-gray-400 font-normal">{currentMarket.currencySymbol}</span>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`
            absolute top-full left-0 mt-2 z-50
            min-w-[220px]
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-xl shadow-lg
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-150
          `}
          role="listbox"
          aria-label="Marchés disponibles"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Marché actif
            </p>
          </div>

          {/* Liste des marchés */}
          <ul className="py-1">
            {ACTIVE_MARKETS.map((market) => {
              const isCurrent = market.id === currentMarketId;
              return (
                <li key={market.id}>
                  <button
                    onClick={() => navigateToMarket(market)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3
                      text-left text-sm
                      transition-colors duration-100
                      ${
                        isCurrent
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }
                    `}
                    role="option"
                    aria-selected={isCurrent}
                    disabled={isCurrent}
                  >
                    {/* Drapeau */}
                    <span className="text-xl leading-none" role="img" aria-label={market.label}>
                      {market.flag}
                    </span>

                    {/* Infos */}
                    <div className="flex-1">
                      <div className="font-medium">{market.nativeLabel}</div>
                      <div className="text-xs text-gray-400">
                        {market.domain} · {market.currency}
                      </div>
                    </div>

                    {/* Badge "Actif" */}
                    {isCurrent && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                    )}

                    {/* Badge programme affilié */}
                    <span
                      className={`
                        flex-shrink-0 text-xs px-1.5 py-0.5 rounded
                        ${
                          market.affiliateProgram.startsWith('amazon')
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        }
                      `}
                    >
                      {market.affiliateProgram.startsWith('amazon') ? 'Amazon' : 'Awin'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Footer — ajouter un marché */}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 italic">
              + Ajouter un marché dans markets.config.ts
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────
 * MarketBadge — Badge compact pour afficher le marché actif
 * Usage : dans le header, les cartes produit, etc.
 * ─────────────────────────────────────────────────────
 */
export function MarketBadge({ marketId }: { marketId: MarketId }) {
  const market = ACTIVE_MARKETS.find((m) => m.id === marketId);
  if (!market) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
      title={market.domain}
    >
      <span role="img" aria-label={market.label}>{market.flag}</span>
      {market.label}
    </span>
  );
}
