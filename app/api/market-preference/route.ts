import { NextRequest, NextResponse } from 'next/server';
import { isValidMarket } from '@/lib/market';
import { ACTIVE_MARKET_COOKIE } from '@/lib/get-active-market';

// Seule route qui ÉCRIT la préférence de marché admin (cookie). Le reste du
// code ne fait que LIRE via getActiveMarket() — un seul point d'écriture,
// un seul point de lecture (cf. lib/get-active-market.ts).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const market = body.market;

  if (!isValidMarket(market)) {
    return NextResponse.json({ error: 'Marché invalide' }, { status: 400 });
  }

  const response = NextResponse.json({ success: true, market });
  response.cookies.set(ACTIVE_MARKET_COOKIE, market, {
    httpOnly: false, // lu aussi côté client pour hydrater le Context immédiatement
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    // path '/' (pas '/admin') : ce cookie doit aussi être envoyé sur les
    // routes /api/** internes à l'admin (fetch depuis les pages admin),
    // pas seulement /admin/**.
    path: '/',
  });
  return response;
}
