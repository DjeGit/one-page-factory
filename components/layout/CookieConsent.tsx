'use client';

import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('tendpick_cookie_consent');
      if (!consent) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try { localStorage.setItem('tendpick_cookie_consent', 'accepted'); } catch {}
    setVisible(false);
  }

  function decline() {
    try { localStorage.setItem('tendpick_cookie_consent', 'declined'); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6"
    >
      <div className="max-w-3xl mx-auto bg-gray-900 border border-white/15 rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white mb-1">🍪 Ce site utilise des cookies</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Nous utilisons des cookies pour mesurer l&apos;audience et améliorer votre expérience. Certains partenaires (Amazon, Meta, TikTok) peuvent également en déposer pour vous proposer des publicités pertinentes.{' '}
            <a href="/politique-confidentialite" className="underline hover:text-gray-200 transition-colors">
              En savoir plus
            </a>
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0 w-full sm:w-auto">
          <button
            onClick={decline}
            className="flex-1 sm:flex-none text-xs text-gray-400 hover:text-white border border-white/15 hover:border-white/30 transition-colors px-4 py-2 rounded-lg"
          >
            Refuser
          </button>
          <button
            onClick={accept}
            className="flex-1 sm:flex-none text-xs bg-violet-600 hover:bg-violet-500 transition-colors text-white font-semibold px-4 py-2 rounded-lg"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
