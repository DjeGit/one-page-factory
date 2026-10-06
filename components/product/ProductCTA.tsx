'use client';

import { useState } from 'react';

interface Props {
  redirectCode: string;
  productId: string;
  label: string;
  className?: string;
}

/**
 * Bouton d'achat de la page produit (maquette A, 06/10) : même mécanique
 * que l'ancien CTAButton (clic enregistré en tâche de fond via
 * /api/analytics, puis redirection immédiate vers /api/go/<code> qui
 * porte le tracking affilié) — seul le style change, aux couleurs du site
 * catalogue (orange CTA) au lieu du violet/ambre de l'ancienne one-page.
 */
export default function ProductCTA({ redirectCode, productId, label, className = '' }: Props) {
  const [loading, setLoading] = useState(false);

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

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`bg-site-cta hover:bg-site-cta-hover text-white font-bold rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
    >
      {label}
    </button>
  );
}
