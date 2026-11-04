import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Renvoie { test: ABTest | null, variant: 'a' | 'b' }. Route publique : on ne
// renvoie que ce dont la page a besoin (textes des variantes), pas les compteurs.
const PUBLIC_COLUMNS =
  'id, product_id, variant_a_title, variant_a_subtitle, variant_a_cta, variant_b_title, variant_b_subtitle, variant_b_cta';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug;
  if (!/^[a-z0-9-]{1,160}$/i.test(slug)) return NextResponse.json({ test: null, variant: 'a' });

  const sb = getSupabaseAdmin();
  // Produit ACTIF uniquement : un brouillon ne doit pas révéler son test.
  const { data: product } = await sb.from('products').select('id').eq('slug', slug).eq('active', true).maybeSingle();
  if (!product) return NextResponse.json({ test: null, variant: 'a' });
  // .limit(1) + maybeSingle : avec deux tests actifs sur le même produit,
  // .single() échouait et plus aucun test ne s'affichait.
  const { data: test } = await sb
    .from('ab_tests')
    .select(PUBLIC_COLUMNS)
    .eq('product_id', product.id)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!test) return NextResponse.json({ test: null, variant: 'a' });
  const variant = Math.random() < 0.5 ? 'a' : 'b';
  return NextResponse.json({ test, variant });
}
