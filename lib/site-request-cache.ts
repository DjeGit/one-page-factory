import * as React from 'react';

/**
 * Mémoïsation « par requête » (React.cache) : dans une page Next, la fonction
 * generateMetadata et le composant de la page lisent souvent les mêmes données
 * (produit, catégorie, articles…). Sans ceci, chaque lecture partait deux
 * fois vers Supabase pour un même affichage. React.cache les partage le temps
 * d'UNE requête (rien n'est gardé entre deux visiteurs, donc pas de donnée
 * périmée).
 *
 * Hors rendu serveur React (tests vitest, scripts), React.cache n'existe pas :
 * on retombe alors sur la fonction d'origine, sans mémoïsation.
 */
export function requestCache<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const cache = (React as unknown as { cache?: <T extends (...a: never[]) => unknown>(f: T) => T }).cache;
  return typeof cache === 'function' ? (cache(fn as never) as unknown as (...args: A) => R) : fn;
}
