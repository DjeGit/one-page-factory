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

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const { pathname } = request.nextUrl;
  const market = getMarket(host);

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
      return res;
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
    res.headers.set('x-market-locale', market === 'fr' ? 'fr-FR' : market === 'es' ? 'es-ES' : 'en-US');
    res.cookies.set('opf_market', market, { path: '/', maxAge: 2592000, sameSite: 'lax' });
    return res;
  }

  // ── Défaut (localhost / dev) : pass-through avec header marché ──────────────
  const res = NextResponse.next();
  res.headers.set('x-market', market);
  res.headers.set('x-market-locale', market === 'fr' ? 'fr-FR' : market === 'es' ? 'es-ES' : 'en-US');
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
