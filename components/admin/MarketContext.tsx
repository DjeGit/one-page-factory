'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export type Market = 'fr' | 'es' | 'com';

export interface MarketInfo {
  id: Market;
  label: string;
  flag: string;
  name: string;
  amazon: string;
  currency: string;
  locale: string;
  tag: string; // Amazon affiliate tag
}

export const MARKETS: MarketInfo[] = [
  {
    id: 'fr',
    label: 'FR',
    flag: '🇫🇷',
    name: 'France',
    amazon: 'amazon.fr',
    currency: 'EUR',
    locale: 'fr-FR',
    tag: 'tendpick-21',
  },
  {
    id: 'es',
    label: 'ES',
    flag: '🇪🇸',
    name: 'Espagne',
    amazon: 'amazon.es',
    currency: 'EUR',
    locale: 'es-ES',
    tag: 'tendpick-es-21',
  },
  {
    id: 'com',
    label: 'COM',
    flag: '🌍',
    name: 'International',
    amazon: 'amazon.com',
    currency: 'USD',
    locale: 'en-US',
    tag: 'tendpick-com-21',
  },
];

interface MarketContextType {
  market: Market;
  setMarket: (market: Market) => void;
  currentMarket: MarketInfo;
}

const MarketContext = createContext<MarketContextType>({
  market: 'fr',
  setMarket: () => {},
  currentMarket: MARKETS[0],
});

function setMarketCookie(market: Market) {
  // Cookie readable by Next.js server components via cookies()
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `opf_market=${market}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
  localStorage.setItem('opf_market', market);
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [market, setMarketState] = useState<Market>('fr');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Read from localStorage first, then cookie
    const saved = localStorage.getItem('opf_market') as Market | null;
    if (saved && ['fr', 'es', 'com'].includes(saved)) {
      setMarketState(saved);
    } else {
      // Fallback: read cookie
      const cookieMatch = document.cookie.match(/opf_market=([^;]+)/);
      if (cookieMatch && ['fr', 'es', 'com'].includes(cookieMatch[1])) {
        setMarketState(cookieMatch[1] as Market);
      }
    }
    setHydrated(true);
  }, []);

  const setMarket = (m: Market) => {
    setMarketState(m);
    setMarketCookie(m);
    router.refresh(); // Re-render server components with new cookie
  };

  const currentMarket = MARKETS.find((m) => m.id === market) ?? MARKETS[0];

  // Avoid hydration mismatch
  if (!hydrated) {
    return <>{children}</>;
  }

  return (
    <MarketContext.Provider value={{ market, setMarket, currentMarket }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  return useContext(MarketContext);
}
