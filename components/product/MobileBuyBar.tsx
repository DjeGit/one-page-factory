'use client';

import { useEffect, useState } from 'react';

interface Props {
  redirectCode: string;
  productId: string;
  productName: string;
  priceLabel: string | null;
  ctaLabel: string;
}

/**
 * Barre d'achat collée en bas, MOBILE uniquement (remplace StickyBuy, qui
 * était en violet/gris foncé de l'ancienne one-page). Apparaît après 400 px
 * de défilement, c'est-à-dire une fois la boîte d'achat principale sortie
 * de l'écran — même seuil et même logique que StickyBuy.
 */
export default function MobileBuyBar({ redirectCode, productId, productName, priceLabel, ctaLabel }: Props) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleClick() {
    setLoading(true);
    try {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, type: 'click' }),
      }).catch(() => {});
    } finally {
      window.location.href = `/api/go/${redirectCode}`;
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white border-t border-site-border shadow-[0_-6px_20px_rgba(27,42,74,0.08)] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-site-primary truncate">{productName}</div>
          {priceLabel && <div className="text-sm font-bold text-site-cta">{priceLabel}</div>}
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="flex-shrink-0 bg-site-cta hover:bg-site-cta-hover text-white font-bold text-[15px] px-5 py-3 rounded-xl transition-colors disabled:opacity-70"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
