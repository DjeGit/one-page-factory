/**
 * /api/social/schedule (Nav admin — Réseaux sociaux > Programmés)
 *
 * Programmation dans le temps d'un post multi-canal — la publication
 * elle-même reste celle du registre Sprint 3 (mêmes canaux, même
 * double-gate configuré+activé), exécutée plus tard par
 * /api/cron/social-publish, jamais ici : POST ne fait qu'enregistrer la
 * ligne en base avec status='pending'.
 *
 * POST body : { channelIds: string[], text: string, scheduledAt: string
 *               (ISO, dans le futur), imageUrls?, videoUrl?, link?, market }
 * GET ?status=&market= — liste (Admin > Réseaux sociaux > Programmés).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { isValidMarket } from '@/lib/market';
import { isAuthorizedRequest } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const { searchParams } = req.nextUrl;
  const statusFilter = searchParams.get('status');
  const marketFilter = searchParams.get('market');

  let query = sb.from('scheduled_posts').select('*').order('scheduled_at', { ascending: true });
  if (statusFilter) query = query.eq('status', statusFilter);
  if (marketFilter && isValidMarket(marketFilter)) query = query.eq('market', marketFilter);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const channelIds: string[] = Array.isArray(body.channelIds) ? body.channelIds : [];
  const text: string = typeof body.text === 'string' ? body.text.trim() : '';
  const market = isValidMarket(body.market) ? body.market : getActiveMarket();
  const scheduledAt = typeof body.scheduledAt === 'string' ? new Date(body.scheduledAt) : null;

  if (!text) return NextResponse.json({ error: 'Le contenu du post est requis.' }, { status: 400 });
  if (channelIds.length === 0) return NextResponse.json({ error: 'Sélectionnez au moins un canal.' }, { status: 400 });
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'Date de programmation invalide.' }, { status: 400 });
  }
  if (scheduledAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'La date de programmation doit être dans le futur.' }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('scheduled_posts')
    .insert({
      channel_ids: channelIds,
      text,
      market,
      scheduled_at: scheduledAt.toISOString(),
      image_urls: Array.isArray(body.imageUrls) ? body.imageUrls : null,
      video_url: typeof body.videoUrl === 'string' && body.videoUrl ? body.videoUrl : null,
      link: typeof body.link === 'string' && body.link ? body.link : null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
