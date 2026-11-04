import { createHash, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export function hashAdminToken(secret: string): string {
  const salt = process.env.ADMIN_SALT || 'tendpick-admin-salt';
  return createHash('sha256').update(secret + salt).digest('hex');
}

/**
 * Comparaison à temps constant pour deux chaînes (secrets, tokens, hash de
 * cookie). Évite les attaques par mesure de timing sur les comparaisons
 * `===` classiques. Retourne false si les longueurs diffèrent (sans lever
 * d'exception — timingSafeEqual exige des buffers de même taille).
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // On compare quand même contre un buffer de même taille que `a` pour ne
    // pas laisser fuiter l'info de longueur via un retour anticipé trivial.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Secret d'administration. En production, un ADMIN_SECRET absent NE DOIT PAS
 * retomber sur une valeur par défaut connue de tous ('changeme' était lisible
 * dans le dépôt : n'importe qui se serait connecté) — on renvoie null et toute
 * l'authentification admin refuse l'accès (échec fermé). En développement et
 * en test, la valeur par défaut est conservée pour ne pas gêner le travail local.
 */
export function getAdminSecret(): string | null {
  const secret = process.env.ADMIN_SECRET;
  if (secret) return secret;
  return process.env.NODE_ENV === 'production' ? null : 'changeme';
}

/** Vérifie la valeur du cookie admin_auth contre le hash attendu (temps constant). */
export function isValidAdminCookie(value: string | undefined | null): boolean {
  if (!value) return false;
  const secret = getAdminSecret();
  if (!secret) return false;
  return timingSafeStringEqual(value, hashAdminToken(secret));
}

/**
 * Autorise une requête serveur-à-serveur (crons, intégrations) : soit un
 * cookie admin_auth valide, soit un header `Authorization: Bearer <token>`
 * correspondant à INTERNAL_CRON_SECRET / PIPELINE_SECRET / ADMIN_SECRET.
 * Reprend le pattern déjà utilisé par app/api/market/refresh et
 * app/api/cron/exchange-rates, centralisé ici pour être réutilisé partout
 * (comparaisons désormais à temps constant).
 */
export function isAuthorizedRequest(req: NextRequest): boolean {
  const cookieValue = req.cookies.get('admin_auth')?.value;
  if (isValidAdminCookie(cookieValue)) return true;

  const authHeader = req.headers.get('authorization') || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) {
    const token = bearerMatch[1].trim();
    const validSecrets = [
      process.env.INTERNAL_CRON_SECRET,
      process.env.PIPELINE_SECRET,
      process.env.ADMIN_SECRET,
    ].filter((s): s is string => Boolean(s));
    for (const secret of validSecrets) {
      if (token && timingSafeStringEqual(token, secret)) return true;
    }
  }

  return false;
}

/**
 * Comme isAuthorizedRequest, mais accepte AUSSI la clé INTERNAL_API_KEY
 * (pipeline Keepa / n8n) : pour les routes appelées à la fois depuis le
 * back-office (cookie) et par un automate (clé interne), par exemple le
 * rapport hebdomadaire. Pas de contournement « clé absente = accès libre » :
 * si INTERNAL_API_KEY n'est pas définie, seule l'authentification admin passe.
 */
export function isAuthorizedAdminOrInternal(req: NextRequest): boolean {
  if (isAuthorizedRequest(req)) return true;
  const key = process.env.INTERNAL_API_KEY;
  if (!key) return false;
  const bearerMatch = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  return Boolean(bearerMatch && timingSafeStringEqual(bearerMatch[1].trim(), key));
}
