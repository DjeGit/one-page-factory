/**
 * Texte prêt pour une balise <meta name="description"> : espaces et sauts de
 * ligne réduits à un seul espace, coupé proprement sur un mot (≈160 caractères,
 * au-delà Google tronque de toute façon) avec « … ». Une description produit
 * multi-paragraphes collée telle quelle donnait un extrait illisible.
 */
export function toMetaDescription(text: string | null | undefined, max = 160): string | undefined {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:.!?-]+$/, '')}…`;
}
