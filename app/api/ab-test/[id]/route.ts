import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('ab_tests').select('*, products(name, slug)').eq('id', params.id).single();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const sb = getSupabaseAdmin();
  const body = await req.json();
  const { data, error } = await sb.from('ab_tests').update(body).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from('ab_tests').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
