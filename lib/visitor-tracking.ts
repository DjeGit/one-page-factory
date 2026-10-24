/**
 * Mesure d'audience maison (24/10/2026) : constantes et fonctions pures
 * partagées par la route /api/visit, le composant VisitTracker et le tableau
 * admin. Sans dépendance serveur, donc testable.
 *
 * Principes (voir aussi la migration 20261024000001_visitor_tracking.sql) :
 *   - rien n'est écrit sans consentement : le navigateur n'appelle l'API
 *     qu'après « Accepter » ;
 *   - le cookie `tp_vid` ne contient qu'un UUID aléatoire, sans donnée
 *     personnelle, HttpOnly, propre à chaque domaine, 13 mois ;
 *   - pas d'adresse IP ni d'user-agent stockés.
 */

export const VISITOR_COOKIE = 'tp_vid';
/** 13 mois, en secondes. */
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 395;
/** Clé sessionStorage de l'identifiant de visite (propre à l'onglet). */
export const SESSION_STORAGE_KEY = 'tp_sid';
/** Durée maximale comptée pour une page : au-delà, l'onglet est resté ouvert sans activité. */
export const MAX_PAGE_SECONDS = 1800;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function isSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_RE.test(value);
}

export type PageType =
  | 'home'
  | 'product'
  | 'category'
  | 'catalog'
  | 'top_sales'
  | 'blog'
  | 'blog_post'
  | 'guide'
  | 'guide_post'
  | 'info'
  | 'legal'
  | 'other';

const INFO_PATHS = new Set(['/a-propos', '/methode', '/contact', '/partenariats']);
const LEGAL_PATHS = new Set(['/mentions-legales', '/politique-confidentialite']);
/** Zones jamais mesurées : back-office, API, aperçus, pages de liens. */
const EXCLUDED_PREFIXES = ['/admin', '/api', '/preview', '/bio', '/_next', '/backoffice'];

/**
 * Nettoie un chemin envoyé par le navigateur (sans paramètres de requête ni
 * ancre) et en déduit le type de page. Renvoie null pour une zone exclue ou
 * un chemin invalide.
 */
export function classifyPath(rawPath: unknown): { path: string; type: PageType } | null {
  if (typeof rawPath !== 'string') return null;
  let path = rawPath.split('#')[0].split('?')[0].trim();
  if (!path.startsWith('/') || path.length > 200) return null;
  if (/[\s\u0000-\u001f]/.test(path)) return null;
  if (path.length > 1) path = path.replace(/\/+$/, '');
  if (EXCLUDED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return null;

  if (path === '/') return { path, type: 'home' };
  if (path === '/produits') return { path, type: 'catalog' };
  if (path === '/top-ventes') return { path, type: 'top_sales' };
  if (path === '/blog') return { path, type: 'blog' };
  if (path.startsWith('/blog/')) return { path, type: 'blog_post' };
  if (path === '/guide-achat') return { path, type: 'guide' };
  if (path.startsWith('/guide-achat/')) return { path, type: 'guide_post' };
  if (path.startsWith('/c/')) return { path, type: 'category' };
  if (INFO_PATHS.has(path)) return { path, type: 'info' };
  if (LEGAL_PATHS.has(path)) return { path, type: 'legal' };
  // Une seule section de chemin qui n'est pas une page connue = fiche produit (/<slug>).
  if (path.split('/').length === 2) return { path, type: 'product' };
  return { path, type: 'other' };
}

/**
 * Domaine d'origine de la visite d'après document.referrer. Renvoie null si
 * absent, invalide ou interne (un lien entre tendpick.fr / .es / .com n'est
 * pas une source de trafic).
 */
export function referrerHost(referrer: unknown): string | null {
  if (typeof referrer !== 'string' || referrer === '') return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
    if (!host || host.length > 100) return null;
    if (host === 'tendpick.fr' || host === 'tendpick.es' || host === 'tendpick.com') return null;
    return host;
  } catch {
    return null;
  }
}

/** Durée en secondes bornée à [0, MAX_PAGE_SECONDS] ; null si invalide. */
export function clampSeconds(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(MAX_PAGE_SECONDS, Math.max(0, Math.round(value)));
}
