'use client';

import { useEffect, useRef, useState } from 'react';

interface ExitIntentPopupProps {
  productName: string;
  redirectCode: string;
  price: number | null;
  discount?: number;
}

export default function ExitIntentPopup({
  productName,
  redirectCode,
  price,
  discount = 15,
}: ExitIntentPopupProps) {
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = `exit_shown_${redirectCode}`;
  const ctaClickedKey = `cta_clicked_${redirectCode}`;

  // Countdown state: starts at 10:00 = 600 seconds
  const [secondsLeft, setSecondsLeft] = useState(600);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function show() {
    if (shownRef.current) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(storageKey)) return;
    if (localStorage.getItem(ctaClickedKey)) return;

    shownRef.current = true;
    localStorage.setItem(storageKey, '1');
    setVisible(true);

    // Start countdown
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function close() {
    setVisible(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
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
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');

  if (!visible) return null;

  return (
    <div
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
          aria-label="Fermer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Headline */}
        <div className="text-4xl mb-2">🛑</div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">Attendez !</h2>
        <p className="text-lg text-gray-600 mb-6">
          Vous partez sans votre{' '}
          <span className="font-bold text-gray-900">{productName}</span> ?
        </p>

        {/* Countdown */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-500 mb-1">Cette offre expire dans</p>
          <div className="text-4xl font-black tabular-nums" style={{ color: secondsLeft < 60 ? '#ef4444' : '#f97316' }}>
            {minutes}:{seconds}
          </div>
        </div>

        {/* Offer */}
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-6">
          <p className="text-orange-700 font-bold text-lg">
            🎉 Offre exclusive : -{discount}% supplémentaire
          </p>
          {price !== null && (
            <p className="text-orange-600 text-sm mt-1">
              Soit{' '}
              <span className="font-bold">
                {(price * (1 - discount / 100)).toFixed(2)}€
              </span>{' '}
              au lieu de {price.toFixed(2)}€
            </p>
          )}
        </div>

        {/* CTA */}
        <a
          href={`/api/go/${redirectCode}`}
          onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.setItem(ctaClickedKey, '1');
            }
          }}
          className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-xl py-4 rounded-xl transition-colors shadow-lg shadow-orange-500/30 mb-4"
        >
          🛒 Je profite de l&apos;offre maintenant
        </a>

        {/* Decline */}
        <button
          onClick={close}
          className="text-gray-400 text-sm hover:text-gray-600 transition-colors underline"
        >
          Non merci, je préfère payer plein tarif
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
