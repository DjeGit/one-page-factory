'use client';

import { useEffect, useRef, useState } from 'react';

interface EmailCapturePopupProps {
  productId: string;
  productName: string;
  slug: string;
  discount: number;
}

type State = 'idle' | 'success' | 'error';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function EmailCapturePopup({
  productId,
  productName,
  slug,
  discount,
}: EmailCapturePopupProps) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [submitting, setSubmitting] = useState(false);
  const shownRef = useRef(false);

  const shownKey = `email_shown_${productId}`;
  const submittedKey = `email_submitted_${productId}`;

  function show() {
    if (shownRef.current) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(shownKey)) return;
    if (localStorage.getItem(submittedKey)) return;

    shownRef.current = true;
    localStorage.setItem(shownKey, '1');
    setVisible(true);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Time trigger: 45 seconds
    const timer = setTimeout(show, 45000);

    // Scroll trigger: 60% of page
    function handleScroll() {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (total > 0 && scrolled / total >= 0.6) {
        show();
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    setVisible(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setState('error');
      return;
    }

    setSubmitting(true);
    setState('idle');

    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), product_id: productId, source_slug: slug }),
      });
      setState('success');
      if (typeof window !== 'undefined') {
        localStorage.setItem(submittedKey, '1');
      }
    } catch {
      setState('error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.65)' }}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
        style={{ animation: 'emailPopupIn 0.3s ease-out forwards' }}
      >
        {/* Close */}
        <button
          onClick={close}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fermer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {state === 'success' ? (
          /* Success state */
          <div className="py-4">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Code envoyé !</h2>
            <p className="text-gray-600 mb-4">
              Utilisez{' '}
              <span className="font-black text-orange-500 text-lg bg-orange-50 px-3 py-1 rounded-lg">
                PROMO{discount}
              </span>{' '}
              à la caisse
            </p>
            <p className="text-sm text-gray-400">
              Vérifiez votre boîte mail pour les détails.
            </p>
            <button
              onClick={close}
              className="mt-6 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Fermer
            </button>
          </div>
        ) : (
          /* Form state */
          <>
            <div className="text-5xl mb-4">🎁</div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              Obtenez -{discount}% sur votre commande
            </h2>
            <p className="text-gray-500 mb-1 text-sm font-medium">{productName}</p>
            <p className="text-gray-600 mb-6">
              Entrez votre email pour recevoir votre code promo exclusif
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (state === 'error') setState('idle');
                  }}
                  placeholder="votre@email.com"
                  className={`w-full px-4 py-3 rounded-xl border-2 text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
                    state === 'error'
                      ? 'border-red-400 bg-red-50 focus:border-red-500'
                      : 'border-gray-200 focus:border-orange-400'
                  }`}
                />
                {state === 'error' && (
                  <p className="text-red-500 text-sm mt-1 text-left">
                    Veuillez entrer une adresse email valide.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black text-lg py-3 rounded-xl transition-colors shadow-lg shadow-orange-500/30"
              >
                {submitting ? 'Envoi en cours...' : 'Recevoir mon code'}
              </button>
            </form>

            <p className="text-gray-400 text-xs mt-4">
              Pas de spam. Désabonnement en 1 clic.
            </p>
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes emailPopupIn {
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
