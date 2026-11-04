import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, dbErrorResponse, invalidId, isUuid, notFound, readJsonObject, unauthorized } from '../../_lib/http';
import { pickAbTestFields } from '../../_lib/ab-test-input';

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('ab_tests').select('*, products(name, slug)').eq('id', params.id).maybeSingle();
  if (error) return dbErrorResponse('GET /api/ab-test/[id]', error);
  if (!data) return notFound('Test introuvable');
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();
  const parsed = await readJsonObject(req);
  if ('response' in parsed) return parsed.response;
  const fields = pickAbTestFields(parsed.body);
  if ('error' in fields) return badRequest(fields.error);
  if (Object.keys(fields.data).length === 0) return badRequest('Aucune modification à enregistrer');

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('ab_tests').update(fields.data).eq('id', params.id).select().maybeSingle();
  if (error) return dbErrorResponse('PUT /api/ab-test/[id]', error);
  if (!data) return notFound('Test introuvable');
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();
  const sb = getSupabaseAdmin();
  const { error } = await sb.from('ab_tests').delete().eq('id', params.id);
  if (error) return dbErrorResponse('DELETE /api/ab-test/[id]', error);
  return NextResponse.json({ success: true });
}
