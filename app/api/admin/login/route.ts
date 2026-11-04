import { NextRequest, NextResponse } from 'next/server';
import { getAdminSecret, hashAdminToken, timingSafeStringEqual } from '@/lib/admin-auth';
import { createRateLimiter, getClientIp } from '../../_lib/http';

// Limiteur en mémoire : 5 tentatives max / 15 min par IP. Complété par un
// plafond global d'ÉCHECS (toutes IP confondues) : un attaquant qui change
// d'adresse (ou falsifie un en-tête) à chaque essai contournait le plafond par IP.
const WINDOW_MS = 15 * 60 * 1000;
const perIp = createRateLimiter(5, WINDOW_MS);
const globalFailures = createRateLimiter(200, WINDOW_MS);
const GLOBAL_KEY = '*';

export async function POST(req: NextRequest) {
  const secret = getAdminSecret();
  if (!secret) {
    // Production sans ADMIN_SECRET : on refuse plutôt que d'accepter un mot de passe par défaut.
    console.error('[admin/login] ADMIN_SECRET absent : connexion impossible');
    return NextResponse.json({ error: "Connexion indisponible : le mot de passe administrateur n'est pas configuré sur le serveur." }, { status: 503 });
  }

  // Sans IP identifiable on ne regroupe pas tout le monde sous « unknown » (un seul essai raté
  // bloquerait alors tous les utilisateurs) : seul le plafond global s'applique.
  const ip = getClientIp(req.headers);
  if (ip && !perIp.allow(ip)) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, { status: 429 });
  }

  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  if (typeof password !== 'string' || password.length === 0 || password.length > 1000 || !timingSafeStringEqual(password, secret)) {
    if (!globalFailures.allow(GLOBAL_KEY)) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, { status: 429 });
    }
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
  }

  if (ip) perIp.reset(ip);

  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_auth', hashAdminToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return response;
}
