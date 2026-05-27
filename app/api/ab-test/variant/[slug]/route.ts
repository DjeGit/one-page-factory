import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Returns { test: ABTest | null, variant: 'a' | 'b' }
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const sb = getSupabaseAdmin();
  const { data: product } = await sb.from('products').select('id').eq('slug', params.slug).single();
  if (!product) return NextResponse.json({ test: null, variant: 'a' });
  const { data: test } = await sb.from('ab_tests').select('*').eq('product_id', product.id).eq('active', true).single();
  if (!test) return NextResponse.json({ test: null, variant: 'a' });
  const variant = Math.random() < 0.5 ? 'a' : 'b';
  return NextResponse.json({ test, variant });
}
