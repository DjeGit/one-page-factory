/**
 * Comptages par produit (clics, vues) en parallèle.
 *
 * Avant (19/10) : getAnalytics() et computeMarketROI() interrogeaient Supabase une fois par produit, l'une après
 * l'autre (2 requêtes × N produits en file indienne) : 4 à 5 secondes pour ouvrir la liste des produits.
 * Ici les requêtes partent par lots en parallèle : le temps total ≈ un aller-retour par lot.
 */

type CountResult = { count: number | null; error?: unknown };
/** Fait un `select count(*) … where product_id = id` sur la table voulue (injecté pour les tests). */
export type CountOne = (table: 'clicks' | 'page_views', productId: string) => PromiseLike<CountResult>;

export const COUNT_BATCH = 16;

/** Nombre de lignes de `table` par produit. Un produit en erreur compte 0 (comme avant : `count || 0`). */
export async function countsByProduct(
  countOne: CountOne,
  table: 'clicks' | 'page_views',
  productIds: string[],
  batch: number = COUNT_BATCH,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ids = Array.from(new Set(productIds));
  for (let i = 0; i < ids.length; i += batch) {
    const slice = ids.slice(i, i + batch);
    const results = await Promise.all(slice.map((id) => countOne(table, id)));
    slice.forEach((id, k) => out.set(id, results[k]?.count ?? 0));
  }
  return out;
}
