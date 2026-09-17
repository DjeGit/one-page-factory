/**
 * OPF — Middleware V2
 * - Détecte le marché depuis le hostname
 * - Routing domaine : OPF = back-office uniquement, Tendpick = public uniquement
 */
import { NextRequest, NextResponse } from 'next/server';

type Market = 'fr' | 'es' | 'com';

function getMarket(host: string): Market {
  const h = (host ?? '').split(':')[0].toLowerCase();
  if (h.includes('tendpick.es')) return 'es';
  if (h.includes('tendpick.com') && !h.includes('tendpick.fr')) return 'com';
  return 'fr';
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
