'use client';

import { useEffect, useRef, useState } from 'react';
import type { Market } from '@/lib/market';
import { SITE_COPY } from '@/lib/site-copy';

interface ExitIntentPopupProps {
  productName: string;
  redirectCode: string;
  /** Marché de la fiche : langue du texte. */
  market: Market;
}

// localStorage peut lever une exception (navigation privée, stockage bloqué) :
// la fenêtre ne doit jamais faire planter la page.
function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignoré
  }
}

export default function ExitIntentPopup({
  productName,
  redirectCode,
  market,
}: ExitIntentPopupProps) {
  const copy = SITE_COPY[market].popups;
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = `exit_shown_${redirectCode}`;
  const ctaClickedKey = `cta_clicked_${redirectCode}`;

  function show() {
    if (shownRef.current) return;
    if (typeof window === 'undefined') return;
    if (storageGet(storageKey) || storageGet(ctaClickedKey)) return;

    shownRef.current = true;
    storageSet(storageKey, '1');
    setVisible(true);
  }

  function close() {
    setVisible(false);
  }

  function resetInactivityTimer() {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      show();
    }, 30000);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Desktop: mouseleave toward top
    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY <= 5) {
        show();
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave);

    // Mobile: inactivity timer
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile) {
      const events: (keyof DocumentEventMap)[] = ['touchstart', 'touchmove', 'scroll'];
      events.forEach((ev) => document.addEventListener(ev, resetInactivityTimer, { passive: true }));
      resetInactivityTimer();
    }

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Échap ferme la fenêtre (accessibilité clavier).
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible]);

  if (!visible) return null;

  const [before, name, after] = copy.exit.leaving(productName);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-popup-title"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.65)' }}
    >
      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in"
        style={{ animation: 'exitPopupIn 0.3s ease-out forwards' }}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={copy.close}
        >
          <svg className="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Headline */}
        <div className="text-4xl mb-2" aria-hidden="true">🛑</div>
        <h2 id="exit-popup-title" className="text-3xl font-black text-gray-900 mb-2">{copy.exit.title}</h2>
        <p className="text-lg text-gray-600 mb-6">
          {before}{' '}
          <span className="font-bold text-gray-900">{name}</span>
          {after}
        </p>

        {/* CTA */}
        <a
          href={`/api/go/${redirectCode}`}
          rel="sponsored nofollow noopener"
          onClick={() => storageSet(ctaClickedKey, '1')}
          className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-xl py-4 rounded-xl transition-colors shadow-lg shadow-orange-500/30 mb-4"
        >
          🛒 {copy.exit.cta}
        </a>

        {/* Decline */}
        <button
          onClick={close}
          className="text-gray-400 text-sm hover:text-gray-600 transition-colors underline"
        >
          {copy.exit.decline}
        </button>
      </div>

      <style jsx global>{`
        @keyframes exitPopupIn {
          from {
            opacity: 0;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
