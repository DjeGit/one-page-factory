'use client';

import { useEffect } from 'react';

// Filet de sécurité : si une page de l'admin plante, on affiche un message clair avec un bouton
// « Réessayer » (le menu reste utilisable) au lieu de l'écran d'erreur générique de Next.js.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[admin] erreur de page :', error);
  }, [error]);

  return (
    <div className="p-8">
      <div role="alert" className="max-w-xl bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
        <h2 className="text-lg font-black mb-1">Cette page n&apos;a pas pu s&apos;afficher</h2>
        <p className="text-sm mb-4">
          Rien n&apos;est perdu : vos données sont intactes. Cela vient souvent d&apos;une connexion lente ou d&apos;une session expirée.
          Réessayez ; si le problème persiste, rechargez la page ou reconnectez-vous.
        </p>
        {error.digest && <p className="text-xs text-red-600 mb-4">Référence technique : {error.digest}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={reset} className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700">
            Réessayer
          </button>
          <a href="/admin" className="px-4 py-2 border border-red-300 text-red-700 text-sm font-semibold rounded-xl hover:bg-red-100">
            Retour au tableau de bord
          </a>
        </div>
      </div>
    </div>
  );
}
