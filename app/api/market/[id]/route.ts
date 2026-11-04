import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, dbErrorResponse, invalidId, isUuid, notFound, readJsonObject, unauthorized } from '../../_lib/http';
import { pickMarketProductFields } from '../../_lib/market-input';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(request)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();
  const parsed = await readJsonObject(request);
  if ('response' in parsed) return parsed.response;
  // Champs connus uniquement : le marché, l'identifiant et les dates ne se modifient pas par cette route.
  const fields = pickMarketProductFields(parsed.body, 'update');
  if ('error' in fields) return badRequest(fields.error);
  if (Object.keys(fields.data).length === 0) return badRequest('Aucune modification à enregistrer');

  const { data, error } = await getSupabaseAdmin()
    .from('market_products')
    .update(fields.data)
    .eq('id', params.id)
    .select()
    .maybeSingle();

  if (error) return dbErrorResponse('PUT /api/market/[id]', error);
  if (!data) return notFound('Ligne introuvable');
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(request)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();

  const { error } = await getSupabaseAdmin()
    .from('market_products')
    .delete()
    .eq('id', params.id);

  if (error) return dbErrorResponse('DELETE /api/market/[id]', error);
  return NextResponse.json({ success: true });
}
