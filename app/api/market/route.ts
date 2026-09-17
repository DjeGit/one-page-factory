import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { isValidMarket } from '@/lib/market';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const market = getActiveMarket();

  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin
    .from('market_products')
    .select('*')
    .eq('market', market)
    .order('trend_score', { ascending: false })
    .order('confidence_score', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const body = await request.json();
  const market = isValidMarket(body.market) ? body.market : getActiveMarket();

  const { data, error } = await supabaseAdmin
    .from('market_products')
    .insert({ ...body, market })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
