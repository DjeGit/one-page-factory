/**
 * /api/social/schedule/[id] — annulation d'un post programmé.
 * Seul un post encore 'pending' peut être annulé (un post déjà envoyé ou
 * échoué est un fait accompli, pas un brouillon).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, dbErrorResponse, invalidId, isUuid, notFound, readOptionalJsonObject, unauthorized } from '../../../_lib/http';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();
  const parsed = await readOptionalJsonObject(req);
  if ('response' in parsed) return parsed.response;
  if (parsed.body.status !== 'cancelled') {
    return badRequest("Seule la transition vers 'cancelled' est permise ici.");
  }

  const sb = getSupabaseAdmin();
  // Annulation atomique : seule une ligne encore 'pending' est modifiée. Avant, lecture puis
  // écriture séparées — un post pris en charge par le cron entre les deux était annulé « à côté »
  // alors qu'il partait quand même.
  const { data, error } = await sb
    .from('scheduled_posts')
    .update({ status: 'cancelled' })
    .eq('id', params.id)
    .eq('status', 'pending')
    .select()
    .maybeSingle();
  if (error) return dbErrorResponse('PATCH /api/social/schedule/[id]', error);
  if (data) return NextResponse.json(data);

  const { data: existing, error: fetchError } = await sb.from('scheduled_posts').select('id, status').eq('id', params.id).maybeSingle();
  if (fetchError) return dbErrorResponse('PATCH /api/social/schedule/[id] (lecture)', fetchError);
  if (!existing) return notFound('Post programmé introuvable.');
  return NextResponse.json(
    { error: `Impossible d'annuler un post au statut '${existing.status}'.` },
    { status: 409 }
  );
}
