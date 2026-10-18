/**
 * Petit cache mémoire (par processus Node) pour les lectures Supabase des
 * pages publiques. Toutes les pages sont en force-dynamic : sans cache,
 * chaque visite (et chaque passage de bot) déclenche 4-5 requêtes Supabase
 * et le process unique sature dès qu'il y a du trafic parallèle.
 *
 * - TTL court : une modif faite dans l'admin apparaît en <= TTL secondes.
 * - Les appels simultanés sur la même clé partagent une seule requête.
 * - Les erreurs / résultats vides ne sont pas gardés longtemps (TTL réduit).
 */
type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 500;

export async function ttlCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  isEmpty: (v: T) => boolean = (v) => Array.isArray(v) && v.length === 0,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > now) return hit.value;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const p = loader()
    .then((value) => {
      if (store.size >= MAX_ENTRIES) store.clear();
      store.set(key, { value, expires: Date.now() + (isEmpty(value) ? Math.min(ttlMs, 5_000) : ttlMs) });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function clearTtlCache(): void {
  store.clear();
}
