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

// Même nom que ACTIVE_MARKET_COOKIE (lib/get-active-market.ts) : recopié ici car ce fichier
// serveur importe next/headers et ne peut pas être chargé dans un composant client.
const ACTIVE_MARKET_COOKIE = 'active_market';

/**
 * Écrit le cookie du marché tout de suite côté navigateur. Sans cela, les écrans qui rechargent leurs
 * données dès que le marché change (étude de marché, liste de leads…) partaient AVANT que le serveur
 * ait posé le cookie, et affichaient donc encore les données du marché précédent.
 */
function writeMarketCookie(market: Market) {
  try {
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${ACTIVE_MARKET_COOKIE}=${market}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
  } catch {
    // cookies indisponibles : le POST ci-dessous reste la voie de secours
  }
}

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
      writeMarketCookie(next); // cookie à jour AVANT tout rechargement de données
      setMarketState(next); // UI instantanée
      fetch('/api/market-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market: next }),
      })
        .catch(() => {
          // le cookie est déjà posé côté navigateur : on rafraîchit quand même
        })
        .finally(() => {
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
