/**
 * Garde anti-doublon en mémoire (par processus) : « cette clé a-t-elle déjà été vue dans les dernières `windowMs` ms ? »
 *
 * Sert à ne compter qu'une fois un double-clic ou un pré-chargement de lien (même visiteur, même produit, quelques
 * secondes d'écart). Volontairement local au processus : pas de base de données pour ça, et en cas de redémarrage
 * on retombe simplement sur « tout compter », jamais sur « perdre un clic ».
 */
export function createRecentGuard(windowMs: number, maxKeys: number = 5000) {
  const seenAt = new Map<string, number>();

  /** true = déjà vu dans la fenêtre (à ignorer) ; false = première fois (et la clé est mémorisée). */
  return function alreadySeen(key: string, now: number = Date.now()): boolean {
    const last = seenAt.get(key);
    if (last !== undefined && now - last < windowMs) return true;

    if (seenAt.size >= maxKeys) {
      seenAt.forEach((t, k) => {
        if (now - t >= windowMs) seenAt.delete(k);
      });
      // Toujours plein (afflux de clés distinctes) : on repart de zéro plutôt que de grossir sans limite.
      if (seenAt.size >= maxKeys) seenAt.clear();
    }
    seenAt.set(key, now);
    return false;
  };
}
