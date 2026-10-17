'use client';

interface Props {
  redirectCode: string;
  productId: string;
  label: string;
  className?: string;
}

/**
 * Bouton d'achat de la page produit (maquette A, 06/10). Même mécanique que
 * l'ancien CTAButton : le clic est enregistré en tâche de fond via
 * /api/analytics, puis le navigateur suit /api/go/<code> qui porte le
 * tracking affilié.
 *
 * Audit SEO du 07/10 (E10) : c'était un <button> qui changeait
 * window.location — invisible pour les moteurs et sans rel. C'est
 * désormais un vrai lien, marqué rel="sponsored nofollow" comme l'exige
 * Google pour un lien commercial ; la requête de tracking part avec
 * keepalive pour survivre à la navigation.
 */
export default function ProductCTA({ redirectCode, productId, label, className = '' }: Props) {
  function track() {
    try {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, type: 'click' }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Le suivi ne doit jamais bloquer la redirection.
    }
  }

  return (
    <a
      href={`/api/go/${redirectCode}`}
      rel="sponsored nofollow noopener"
      onClick={track}
      className={`block text-center bg-site-cta hover:bg-site-cta-hover text-white font-bold rounded-xl transition-colors ${className}`}
    >
      {label}
    </a>
  );
}
