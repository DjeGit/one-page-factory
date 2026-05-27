import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  const { test_id, variant, type } = await req.json();
  const sb = getSupabaseAdmin();
  const field = `variant_${variant}_${type === 'view' ? 'views' : 'clicks'}`;
  // Use rpc or raw update with increment
  const { data: current } = await sb.from('ab_tests').select(field).eq('id', test_id).single();
  if (!current) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const currentRecord = current as unknown as Record<string, number>;
  const newVal = (currentRecord[field] || 0) + 1;
  await sb.from('ab_tests').update({ [field]: newVal }).eq('id', test_id);
  return NextResponse.json({ success: true });
}
