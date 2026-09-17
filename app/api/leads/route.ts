import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';

export async function GET() {
  const sb = getSupabaseAdmin();
  const market = getActiveMarket();
  const { data } = await sb.from('email_leads').select('*, products(name, slug)').eq('market', market).order('created_at', { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const sb = getSupabaseAdmin();
  const body = await req.json();
  const { email, product_id, source_slug } = body;
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
  // market dénormalisé depuis le produit concerné (cf. Sprint 1)
  const { data: product } = await sb.from('products').select('market').eq('id', product_id).single();
  const market = product?.market || getActiveMarket();
  const { data, error } = await sb.from('email_leads').upsert({ email, product_id, source_slug, market }, { onConflict: 'email,product_id', ignoreDuplicates: true }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, data });
}
