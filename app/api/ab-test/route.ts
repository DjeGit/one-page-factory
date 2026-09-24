import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { isAuthorizedRequest } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const market = getActiveMarket();
  const { data } = await sb.from('ab_tests').select('*, products(name, slug)').eq('market', market).order('created_at', { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const body = await req.json();
  // market dénormalisé depuis le produit concerné (cf. Sprint 1)
  const { data: product } = await sb.from('products').select('market').eq('id', body.product_id).single();
  const market = product?.market || getActiveMarket();
  const { data, error } = await sb.from('ab_tests').insert({ ...body, market }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
