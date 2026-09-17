'use client';

/**
 * Context React pour le marché actif côté client — hydraté depuis la
 * valeur déjà résolue côté serveur (evite le flash "FR" avant hydratation).
 * La source de vérité reste le cookie (lib/get-active-market.ts) : ce
 * Context ne fait qu'offrir une lecture/écriture instantanée côté UI,
 * synchronisée avec le cookie via /api/market-preference.
 */
import { createContext, useContext, useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Market } from '@/lib/market';

interface MarketContextValue {
  market: Market;
  setMarket: (market: Market) => void;
  isPending: boolean;
}

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({
  initialMarket,
  children,
}: {
  initialMarket: Market;
  children: React.ReactNode;
}) {
  const [market, setMarketState] = useState<Market>(initialMarket);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const setMarket = useCallback(
    (next: Market) => {
      setMarketState(next); // UI instantanée
      fetch('/api/market-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market: next }),
      }).finally(() => {
        // Re-render des Server Components (dashboard, listes...) avec le
        // nouveau cookie une fois écrit côté serveur.
        startTransition(() => router.refresh());
      });
    },
    [router]
  );

  return (
    <MarketContext.Provider value={{ market, setMarket, isPending }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket(): MarketContextValue {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error('useMarket() doit être utilisé sous <MarketProvider>');
  return ctx;
}
