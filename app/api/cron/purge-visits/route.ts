/**
 * /api/cron/purge-visits — conservation 13 mois de la mesure d'audience.
 * Supprime les visiteurs (et leurs visites) non revus depuis 13 mois, via la
 * fonction SQL purge_visitor_data() de la migration 20261024000001.
 *
 * Auth : session admin (cookie) OU secret serveur-à-serveur (Bearer), comme
 * les autres crons (lib/admin-auth.ts → isAuthorizedRequest).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { unauthorized } from '../../_lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const { data, error } = await getSupabaseAdmin().rpc('purge_visitor_data');
  if (error) {
    console.error('[api] POST /api/cron/purge-visits :', error.message);
    return NextResponse.json({ success: false, error: 'La purge des données de visite a échoué (détail dans les logs serveur).' }, { status: 502 });
  }
  return NextResponse.json({ success: true, removed: data ?? 0 });
}
