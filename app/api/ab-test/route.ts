import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const sb = getSupabaseAdmin();
  const { data } = await sb.from('ab_tests').select('*, products(name, slug)').order('created_at', { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const sb = getSupabaseAdmin();
  const body = await req.json();
  const { data, error } = await sb.from('ab_tests').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
