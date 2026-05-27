import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const sb = getSupabaseAdmin();
  const { data } = await sb.from('email_leads').select('*, products(name, slug)').order('created_at', { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const sb = getSupabaseAdmin();
  const body = await req.json();
  const { email, product_id, source_slug } = body;
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
  const { data, error } = await sb.from('email_leads').upsert({ email, product_id, source_slug }, { onConflict: 'email,product_id', ignoreDuplicates: true }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, data });
}
