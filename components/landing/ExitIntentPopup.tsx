'use client';

import { useEffect, useRef, useState } from 'react';

interface ExitIntentPopupProps {
  productName: string;
  redirectCode: string;
}

export default function ExitIntentPopup({
  productName,
  redirectCode,
}: ExitIntentPopupProps) {
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = `exit_shown_${redirectCode}`;
  const ctaClickedKey = `cta_clicked_${redirectCode}`;

  function show() {
    if (shownRef.current) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(storageKey)) return;
    if (localStorage.getItem(ctaClickedKey)) return;

    shownRef.current = true;
    localStorage.setItem(storageKey, '1');
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
          Non merci
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
