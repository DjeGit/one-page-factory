/**
 * Petit cache mémoire (par processus Node) pour les lectures Supabase des
 * pages publiques. Toutes les pages sont en force-dynamic : sans cache,
 * chaque visite (et chaque passage de bot) déclenche 4-5 requêtes Supabase
 * et le process unique sature dès qu'il y a du trafic parallèle.
 *
 * - TTL court : une modif faite dans l'admin apparaît en <= TTL secondes ;
 *   les écritures passant par lib/supabase.ts vident le cache tout de suite
 *   (invalidateTtlCache), seules les écritures faites par un autre process
 *   (scripts, pipeline) attendent la fin du TTL.
 * - Les appels simultanés sur la même clé partagent une seule requête.
 * - Les erreurs / résultats vides ne sont pas gardés longtemps (TTL réduit).
 * - Si Supabase tombe pendant un rechargement, on sert la dernière valeur
 *   connue (« périmée ») plutôt que d'afficher un site vide ou une erreur.
 */
type Entry<T> = { value: T; expires: number; storedAt: number };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 500;

/** Durée max pendant laquelle une valeur périmée peut être resservie si le rechargement échoue. */
export const STALE_MAX_MS = 60 * 60 * 1000;
/** Répit avant de retenter le chargement après un échec (valeur périmée resservie entre-temps). */
const RETRY_AFTER_ERROR_MS = 5_000;

/** Incrémenté à chaque invalidation : un chargement démarré avant ne doit pas réécrire sa valeur déjà périmée. */
let epoch = 0;

function makeRoom(now: number): void {
  if (store.size < MAX_ENTRIES) return;
  // 1) d'abord ce qui est inutilisable (périmé depuis plus que la tolérance)
  store.forEach((entry, key) => {
    if (entry.expires + STALE_MAX_MS < now) store.delete(key);
  });
  // 2) puis les plus anciennes (une Map garde l'ordre d'insertion)
  const keys = Array.from(store.keys());
  for (let i = 0; store.size >= MAX_ENTRIES && i < keys.length; i++) store.delete(keys[i]);
}

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

  const startEpoch = epoch;
  const p: Promise<T> = loader()
    .then((value) => {
      // Invalidation survenue pendant le chargement : la valeur est peut-être déjà périmée, on ne la garde pas.
      if (startEpoch === epoch) {
        makeRoom(Date.now());
        store.delete(key); // ré-insère en fin de Map (ordre = ancienneté)
        store.set(key, {
          value,
          storedAt: Date.now(),
          expires: Date.now() + (isEmpty(value) ? Math.min(ttlMs, 5_000) : ttlMs),
        });
      }
      return value;
    })
    .catch((err: unknown) => {
      // Panne du chargement : on ressert la dernière valeur connue si elle n'est pas trop vieille.
      if (hit && Date.now() - hit.storedAt < STALE_MAX_MS) {
        console.error(`[ttl-cache] "${key}" : rechargement impossible, valeur précédente conservée —`, err);
        if (startEpoch === epoch) store.set(key, { ...hit, expires: Date.now() + RETRY_AFTER_ERROR_MS });
        return hit.value;
      }
      throw err;
    })
    .finally(() => {
      // Ne retire que NOTRE entrée : une invalidation a pu en lancer une plus récente sous la même clé.
      if (inflight.get(key) === p) inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

/**
 * Vide le cache après une écriture (admin) pour que la modification soit visible tout de suite.
 * Sans argument : tout le cache. Avec un préfixe (ex. 'categories:') : seulement les clés qui commencent par lui.
 */
export function invalidateTtlCache(prefix?: string): void {
  epoch += 1;
  if (!prefix) {
    store.clear();
    inflight.clear();
    return;
  }
  store.forEach((_v, key) => {
    if (key.startsWith(prefix)) store.delete(key);
  });
  inflight.forEach((_v, key) => {
    if (key.startsWith(prefix)) inflight.delete(key);
  });
}

export function clearTtlCache(): void {
  invalidateTtlCache();
}
