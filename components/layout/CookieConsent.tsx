'use client';

import { useState, useEffect } from 'react';
import type { Market } from '@/lib/market';
import { CONSENT_COPY, CONSENT_CHANGED_EVENT, type ConsentValue } from '@/lib/consent-copy';

interface CookieConsentProps {
  market: Market;
}

export default function CookieConsent({ market }: CookieConsentProps) {
  const [visible, setVisible] = useState(false);
  const copy = CONSENT_COPY[market].cookieBanner;

  useEffect(() => {
    try {
      const consent = localStorage.getItem('tendpick_cookie_consent');
      if (!consent) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function setConsent(value: ConsentValue) {
    try {
      localStorage.setItem('tendpick_cookie_consent', value);
    } catch {}
    // Prévient PixelInjector, sur la même page et sans rechargement, que le
    // choix vient de changer — voir lib/consent-copy.ts pour le contrat.
    window.dispatchEvent(new CustomEvent<ConsentValue>(CONSENT_CHANGED_EVENT, { detail: value }));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={copy.title}
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6"
    >
      <div className="max-w-3xl mx-auto bg-gray-900 border border-white/15 rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white mb-1">{copy.title}</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            {copy.body}{' '}
            <a href="/politique-confidentialite" className="underline hover:text-gray-200 transition-colors">
              {copy.learnMore}
            </a>
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setConsent('declined')}
            className="flex-1 sm:flex-none text-xs text-gray-400 hover:text-white border border-white/15 hover:border-white/30 transition-colors px-4 py-2 rounded-lg"
          >
            {copy.decline}
          </button>
          <button
            onClick={() => setConsent('accepted')}
            className="flex-1 sm:flex-none text-xs bg-violet-600 hover:bg-violet-500 transition-colors text-white font-semibold px-4 py-2 rounded-lg"
          >
            {copy.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
