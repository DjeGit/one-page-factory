/**
 * /api/social/schedule/[id] — annulation d'un post programmé.
 * Seul un post encore 'pending' peut être annulé (un post déjà envoyé ou
 * échoué est un fait accompli, pas un brouillon).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  if (body.status !== 'cancelled') {
    return NextResponse.json({ error: "Seule la transition vers 'cancelled' est permise ici." }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data: existing, error: fetchError } = await sb
    .from('scheduled_posts')
    .select('id, status')
    .eq('id', params.id)
    .single();
  if (fetchError || !existing) return NextResponse.json({ error: 'Post programmé introuvable.' }, { status: 404 });
  if (existing.status !== 'pending') {
    return NextResponse.json({ error: `Impossible d'annuler un post au statut '${existing.status}'.` }, { status: 400 });
  }

  const { data, error } = await sb
    .from('scheduled_posts')
    .update({ status: 'cancelled' })
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
