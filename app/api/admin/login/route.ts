import { NextRequest, NextResponse } from 'next/server';
import { hashAdminToken, timingSafeStringEqual } from '@/lib/admin-auth';

// In-memory rate limiter: 5 tentatives max / 15 min par IP.
// Limite connue : réinitialisé si le process PM2 redémarre, et ne serait pas partagé
// entre plusieurs instances si le serveur passe un jour en mode cluster PM2.
// Suffisant pour un seul process (config actuelle sur le Hetzner) — passer à un
// compteur Supabase/Redis partagé si un jour plusieurs instances tournent.
const attempts = new Map<string, { count: number; resetAt: number }>();

function getIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  record.count++;
  return record.count > 5;
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
      { status: 429 }
    );
  }

  try {
    const { password } = await req.json();
    const secret = process.env.ADMIN_SECRET || 'changeme';

    if (typeof password !== 'string' || !timingSafeStringEqual(password, secret)) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
    }

    attempts.delete(ip);

    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_auth', hashAdminToken(secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // durci (Sprint 0 sécurité) — pas de besoin cross-site pour ce cookie admin
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
