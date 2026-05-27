'use client';

import { useState, useEffect } from 'react';

interface StickyBuyProps {
  redirectCode: string;
  productId: string;
  price: number | null;
  productName: string;
}

export default function StickyBuy({ redirectCode, productId, price, productName }: StickyBuyProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 400px (past hero)
      setVisible(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = async () => {
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
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-gray-950/95 backdrop-blur-md border-t border-gray-800 px-4 py-3 safe-area-pb">
        <div className="flex items-center gap-3">
          {/* Price */}
          <div className="flex-shrink-0">
            {price && (
              <div className="text-2xl font-black text-white">{price.toFixed(2)}€</div>
            )}
            <div className="text-xs text-gray-400 truncate max-w-[120px]">{productName}</div>
          </div>

          {/* CTA */}
          <button
            onClick={handleClick}
            disabled={loading}
            className="flex-1 bg-accent-500 hover:bg-accent-600 text-white font-black py-3.5 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-70 text-base"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Chargement...
              </span>
            ) : (
              '🛒 Acheter maintenant'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
