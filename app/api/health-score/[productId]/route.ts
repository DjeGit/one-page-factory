import { getSupabaseAdmin } from '@/lib/supabase';
import { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', params.productId)
      .single();

    if (error || !product) {
      return Response.json({ score: null }, { status: 404 });
    }

    let score = 0;
    if (product.hero_title)  score += 15;
    if (product.hero_subtitle) score += 10;
    if (Array.isArray(product.pain_points) && product.pain_points.length > 0) score += 10;
    if (Array.isArray(product.benefits) && product.benefits.length > 0) score += 10;
    if (product.tiktok_script) score += 5;
    if (product.amazon_url) score += 20;
    if (product.price && product.price > 0) score += 10;
    if (product.active) score += 10;
    if (product.template_id) score += 5;
    if (product.meta_title) score += 5;

    return Response.json({ score: Math.min(score, 100) });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
