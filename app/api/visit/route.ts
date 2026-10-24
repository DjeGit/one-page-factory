/**
 * /api/visit — mesure d'audience maison (24/10/2026).
 *
 * Appelée par components/layout/VisitTracker.tsx UNIQUEMENT après le
 * consentement du visiteur aux cookies.
 *
 *   POST {event:'view', sid, newSession, path, referrer}  → enregistre la page
 *        vue et renvoie {visitId}. Pose le cookie `tp_vid` (UUID aléatoire,
 *        HttpOnly, 13 mois) si le visiteur n'en a pas encore.
 *   POST {event:'end', visitId, seconds}                  → temps actif passé
 *        sur la page (borné à 30 min).
 *   DELETE                                                → retrait du
 *        consentement : supprime le cookie ET les données du visiteur.
 *
 * Aucune adresse IP ni user-agent n'est stocké ; les robots connus sont
 * ignorés (lib/bot-detection.ts). Le marché vient du domaine de la requête.
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isBotUserAgent } from '@/lib/bot-detection';
import { getRequestHost, getRequestMarket, isBackofficeHost, isTendpickHost } from '@/lib/site-url';
import {
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
  classifyPath,
  clampSeconds,
  isSessionId,
  isUuid,
  referrerHost,
} from '@/lib/visitor-tracking';

export const dynamic = 'force-dynamic';

// Limiteur en mémoire : 90 événements par minute et par visiteur (un
// visiteur normal en envoie 2 par page). Protège la base contre une boucle
// ou un abus, sans état partagé.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 90;
const rateCache = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateCache.get(key);
  if (!entry || entry.resetAt < now) {
    rateCache.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    if (rateCache.size > 5000) {
      Array.from(rateCache.entries()).forEach(([k, v]) => {
        if (v.resetAt < now) rateCache.delete(k);
      });
    }
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

function ignored(req: NextRequest): boolean {
  const host = getRequestHost(req.headers);
  if (isBackofficeHost(host) || !isTendpickHost(host)) return true;
  return isBotUserAgent(req.headers.get('user-agent'));
}

export async function POST(req: NextRequest) {
  if (ignored(req)) return new NextResponse(null, { status: 204 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const existingId = req.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = isUuid(existingId) ? existingId : randomUUID();
  if (rateLimited(visitorId)) return new NextResponse(null, { status: 429 });

  const sb = getSupabaseAdmin();

  if (body.event === 'end') {
    const seconds = clampSeconds(body.seconds);
    if (!isUuid(body.visitId) || seconds === null || !isUuid(existingId)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }
    await sb
      .from('page_visits')
      .update({ duration_seconds: seconds })
      .eq('id', body.visitId)
      .eq('visitor_id', existingId);
    return new NextResponse(null, { status: 204 });
  }

  if (body.event !== 'view') {
    return NextResponse.json({ error: 'Événement inconnu' }, { status: 400 });
  }

  const page = classifyPath(body.path);
  if (!page) return new NextResponse(null, { status: 204 });
  if (!isSessionId(body.sid)) return NextResponse.json({ error: 'Session invalide' }, { status: 400 });

  const market = getRequestMarket(req.headers);
  const newSession = body.newSession === true;

  try {
    const { data: known } = await sb
      .from('visitors')
      .select('visit_count')
      .eq('visitor_id', visitorId)
      .maybeSingle();

    if (!known) {
      await sb.from('visitors').insert({ visitor_id: visitorId, market });
    } else {
      await sb
        .from('visitors')
        .update({
          last_seen: new Date().toISOString(),
          visit_count: Number(known.visit_count) + (newSession ? 1 : 0),
        })
        .eq('visitor_id', visitorId);
    }

    const { data: inserted, error } = await sb
      .from('page_visits')
      .insert({
        visitor_id: visitorId,
        session_id: body.sid,
        market,
        path: page.path,
        page_type: page.type,
        // La source n'est retenue qu'à l'arrivée d'une nouvelle visite.
        referrer_host: newSession ? referrerHost(body.referrer) : null,
      })
      .select('id')
      .single();
    if (error || !inserted) throw error ?? new Error('insert page_visits');

    const res = NextResponse.json({ visitId: inserted.id });
    if (!isUuid(existingId)) res.cookies.set(VISITOR_COOKIE, visitorId, cookieOptions(VISITOR_COOKIE_MAX_AGE));
    return res;
  } catch (err) {
    console.error('POST /api/visit error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Retrait du consentement : le cookie disparaît et les données du visiteur
// sont effacées (ses visites partent avec, ON DELETE CASCADE).
export async function DELETE(req: NextRequest) {
  if (ignored(req)) return new NextResponse(null, { status: 204 });
  const existingId = req.cookies.get(VISITOR_COOKIE)?.value;
  if (isUuid(existingId)) {
    try {
      await getSupabaseAdmin().from('visitors').delete().eq('visitor_id', existingId);
    } catch (err) {
      console.error('DELETE /api/visit error:', err);
    }
  }
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(VISITOR_COOKIE, '', cookieOptions(0));
  return res;
}
