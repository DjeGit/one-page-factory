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

/** Vérifie la valeur du cookie admin_auth contre le hash attendu (temps constant). */
export function isValidAdminCookie(value: string | undefined | null): boolean {
  if (!value) return false;
  const secret = process.env.ADMIN_SECRET || 'changeme';
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
