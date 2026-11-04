/**
 * Petits utilitaires d'appel API pour les écrans de l'admin.
 *
 * Avant : chaque écran faisait `await res.json()` sur une réponse d'erreur ; quand le
 * serveur répondait par une page HTML (erreur 502/504 de nginx ou Cloudflare), Jerome
 * voyait « Unexpected token '<' … » au lieu d'un message compréhensible.
 */

/** Message d'erreur lisible d'une réponse HTTP non réussie (corps JSON { error } si présent). */
export async function readApiError(res: Response, fallback = 'Une erreur est survenue'): Promise<string> {
  try {
    const data = await res.json();
    const msg = typeof data?.error === 'string' ? data.error : typeof data?.message === 'string' ? data.message : '';
    if (msg && msg !== 'Unauthorized') return msg;
    if (res.status === 401 || msg === 'Unauthorized') return 'Session expirée : rechargez la page et reconnectez-vous.';
  } catch {
    // corps non JSON (page d'erreur HTML du proxy)
  }
  if (res.status === 401) return 'Session expirée : rechargez la page et reconnectez-vous.';
  if (res.status === 502 || res.status === 503 || res.status === 504) return 'Le serveur ne répond pas pour le moment, réessayez dans quelques instants.';
  if (res.status === 413) return 'Fichier trop volumineux.';
  return `${fallback} (erreur ${res.status})`;
}

/** Message lisible pour une exception de fetch (réseau coupé, etc.). */
export function networkErrorMessage(err: unknown, fallback = 'Problème de connexion, réessayez.'): string {
  if (err instanceof TypeError) return 'Problème de connexion, réessayez.';
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
