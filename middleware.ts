/**
 * OPF — Middleware V2
 * - Détecte le marché depuis le hostname
 * - Routing domaine : OPF = back-office uniquement, Tendpick = public uniquement
 *
 * Audit 21/09 : cette fonction renvoyait 'com' pour le marché anglophone —
 * une valeur qui n'existe pas dans le type Market canonique ('fr'|'es'|'uk',
 * lib/market.ts). Le cookie opf_market posé plus bas transportait donc une
 * valeur invalide pour tout code qui la comparait à 'uk'. Corrigé pour
 * utiliser la détection canonique partagée (lib/market-from-host.ts) — le
 * rendu des pages ne dépend plus de ce cookie de toute façon (voir
 * app/[slug]/page.tsx et app/api/go/[code]/route.ts), il reste posé pour
 * un usage futur éventuel côté client, mais avec la bonne valeur désormais.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getMarketFromHost } from '@/lib/market-from-host';
import type { Market } from '@/lib/market';
import { getRequestHost, isTendpickHost } from '@/lib/site-url';

function getMarket(host: string): Market {
  return getMarketFromHost(host);
}

function isOPFDomain(host: string): boolean {
  const h = (host ?? '').split(':')[0].toLowerCase();
  // localhost excluded so dev works normally
  return h.includes('one-page-factory.com');
}

function isTendpickDomain(host: string): boolean {
  const h = (host ?? '').split(':')[0].toLowerCase();
  return h.includes('tendpick.');
}

// Zones qui ne doivent jamais apparaître dans un moteur de recherche (audit
// M7) : robots.txt les interdit déjà à l'exploration, mais une URL peut être
// indexée sans être explorée si un site externe y renvoie — l'en-tête
// X-Robots-Tag l'empêche.
function isPrivatePath(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/preview') ||
    pathname.startsWith('/backoffice') ||
    pathname.startsWith('/api/')
  );
}

// Cache du HTML public par le CDN (Cloudflare) : 5 min, puis servi périmé
// jusqu'à 10 min pendant qu'il se recharge. Liste blanche volontairement
// courte : pages éditoriales et listings, sans paramètre de requête.
// Exclues : fiches produit (test A/B par visiteur), /api, /admin, /preview,
// /bio, et toute URL avec ?q=, ?tag=, ?source=… Voir docs/cloudflare-cache.md.
const PUBLIC_PAGE_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';
const CACHEABLE_EXACT = new Set([
  '/', '/produits', '/top-ventes', '/blog', '/guide-achat',
  '/a-propos', '/methode', '/contact', '/partenariats',
  '/mentions-legales', '/politique-confidentialite',
]);
const CACHEABLE_PREFIXES = ['/c/', '/blog/', '/guide-achat/'];

function isEdgeCacheable(request: NextRequest): boolean {
  if (request.method !== 'GET') return false;
  if (request.nextUrl.search) return false;
  // Requêtes de navigation interne Next (RSC / prefetch) : jamais en cache HTML.
  if (request.headers.get('rsc') || request.headers.get('next-router-prefetch')) return false;
  const { pathname } = request.nextUrl;
  return CACHEABLE_EXACT.has(pathname) || CACHEABLE_PREFIXES.some((p) => pathname.startsWith(p));
}

function withRobots(res: NextResponse, pathname: string): NextResponse {
  if (isPrivatePath(pathname)) res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const { pathname } = request.nextUrl;
  const market = getMarket(host);

  // ── Redirection canonique www → apex (audit E8) ───────────────────────────
  // Une seule version de chaque domaine doit répondre en 200, sinon Google
  // voit deux sites (www et sans www). La redirection http→https n'est
  // volontairement PAS faite ici : Next.js pose lui-même x-forwarded-proto
  // sur la connexion qu'il reçoit (http, derrière nginx), donc la règle
  // bouclerait à l'infini si nginx ne transmet pas le vrai schéma. Elle
  // relève de nginx (bloc `listen 80` → `return 301 https://$host$request_uri`).
  const publicHost = getRequestHost(request.headers);
  if (isTendpickHost(publicHost) && publicHost.startsWith('www.')) {
    const target = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      `https://${publicHost.replace(/^www\./, '')}`
    );
    return NextResponse.redirect(target, 308);
  }

  // ── OPF back-office : bloquer les routes publiques ──────────────────────────
  if (isOPFDomain(host)) {
    // Autoriser : admin, api, et assets Next.js
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/_next')
    ) {
      const res = NextResponse.next();
      res.headers.set('x-market', market);
      return withRobots(res, pathname);
    }
    // Tout le reste → redirection dashboard admin
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // ── Tendpick public : bloquer l'accès admin ─────────────────────────────────
  if (isTendpickDomain(host)) {
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    const res = NextResponse.next();
    res.headers.set('x-market', market);
    res.headers.set('x-market-locale', market === 'fr' ? 'fr-FR' : market === 'es' ? 'es-ES' : 'en-GB');
    // Le cookie opf_market n'est plus posé (21/10) : plus aucun code ne le lit
    // (le marché vient du host), et un Set-Cookie sur chaque page empêche
    // Cloudflare de mettre le HTML public en cache.
    if (isEdgeCacheable(request)) res.headers.set('Cache-Control', PUBLIC_PAGE_CACHE_CONTROL);
    return withRobots(res, pathname);
  }

  // ── Défaut (localhost / dev) : pass-through avec header marché ──────────────
  const res = NextResponse.next();
  res.headers.set('x-market', market);
  res.headers.set('x-market-locale', market === 'fr' ? 'fr-FR' : market === 'es' ? 'es-ES' : 'en-GB');
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
