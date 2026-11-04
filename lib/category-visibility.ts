/**
 * Visibilité publique des catégories (19/10, demande Jerome) :
 * une catégorie s'affiche sur un marché dès qu'elle contient au moins un produit EN LIGNE sur ce marché,
 * et disparaît d'elle-même quand elle n'en contient plus. Plus aucun interrupteur à régler à la main :
 * l'admin et le site ne peuvent donc plus se contredire.
 */
import type { Category } from '@/types';
import type { Market } from '@/lib/market';

export interface ProductCategoryRow {
  category_id: string | null;
  market: string;
}

/** Nombre de produits en ligne par catégorie puis par marché : { [categoryId]: { fr: 2, es: 0, uk: 1 } }. */
export function countActiveByCategory(rows: ProductCategoryRow[]): Record<string, Record<Market, number>> {
  const out: Record<string, Record<Market, number>> = {};
  for (const r of rows) {
    if (!r.category_id) continue;
    if (r.market !== 'fr' && r.market !== 'es' && r.market !== 'uk') continue;
    const entry = (out[r.category_id] ||= { fr: 0, es: 0, uk: 0 });
    entry[r.market] += 1;
  }
  return out;
}

/** Catégories à montrer sur un marché (ou, sans marché, sur au moins un marché), dans l'ordre reçu. */
export function visibleCategories(all: Category[], counts: Record<string, Record<Market, number>>, market?: Market): Category[] {
  return all.filter((c) => {
    const n = counts[c.id];
    if (!n) return false;
    return market ? n[market] > 0 : n.fr + n.es + n.uk > 0;
  });
}
