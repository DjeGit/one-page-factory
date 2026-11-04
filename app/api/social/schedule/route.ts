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
import { badRequest, dbErrorResponse, readJsonObject, unauthorized } from '../../_lib/http';
import { parseSocialInput } from '../../_lib/social-input';

const STATUSES = ['pending', 'processing', 'sent', 'failed', 'cancelled'];
const LIST_LIMIT = 500;

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const sb = getSupabaseAdmin();
  const { searchParams } = req.nextUrl;
  const statusFilter = searchParams.get('status');
  const marketFilter = searchParams.get('market');
  if (statusFilter && !STATUSES.includes(statusFilter)) return badRequest('Statut invalide');

  let query = sb.from('scheduled_posts').select('*').order('scheduled_at', { ascending: true }).limit(LIST_LIMIT);
  if (statusFilter) query = query.eq('status', statusFilter);
  if (marketFilter && isValidMarket(marketFilter)) query = query.eq('market', marketFilter);

  const { data, error } = await query;
  if (error) return dbErrorResponse('GET /api/social/schedule', error);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const parsed = await readJsonObject(req);
  if ('response' in parsed) return parsed.response;
  const body = parsed.body;

  const input = parseSocialInput(body);
  if ('error' in input) return badRequest(input.error);
  const market = isValidMarket(body.market as string) ? (body.market as 'fr' | 'es' | 'uk') : getActiveMarket();
  const scheduledAt = typeof body.scheduledAt === 'string' ? new Date(body.scheduledAt) : null;

  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) return badRequest('Date de programmation invalide.');
  if (scheduledAt.getTime() <= Date.now()) return badRequest('La date de programmation doit être dans le futur.');
  // Au-delà d'un an, c'est presque sûrement une faute de frappe (le post resterait « en attente » indéfiniment).
  if (scheduledAt.getTime() > Date.now() + 366 * 24 * 3600 * 1000) return badRequest('La date de programmation ne peut pas dépasser un an.');

  const { channelIds, text, imageUrls, videoUrl, link } = input.data;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('scheduled_posts')
    .insert({
      channel_ids: channelIds,
      text,
      market,
      scheduled_at: scheduledAt.toISOString(),
      image_urls: imageUrls ?? null,
      video_url: videoUrl ?? null,
      link: link ?? null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return dbErrorResponse('POST /api/social/schedule', error);
  return NextResponse.json(data, { status: 201 });
}
