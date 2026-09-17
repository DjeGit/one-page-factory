import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(_req: Request, { params }: { params: { productId: string } }) {
  const sb = getSupabaseAdmin();

  const [{ data: product }, { count: clicks }, { count: views }, { data: abTest }] = await Promise.all([
    sb.from('products').select('*').eq('id', params.productId).single(),
    sb.from('clicks').select('*', { count: 'exact', head: true }).eq('product_id', params.productId),
    sb.from('page_views').select('*', { count: 'exact', head: true }).eq('product_id', params.productId),
    sb.from('ab_tests').select('id').eq('product_id', params.productId).eq('active', true).single(),
  ]);

  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ctr = views && views > 0 ? (clicks || 0) / views : 0;

  const details = {
    has_image: !!product.image_url,
    has_ai_content: !!(product.hero_title && product.pain_points?.length > 0),
    has_price: !!product.price,
    has_affiliate_url: !!product.affiliate_url,
    has_pixel: !!(product.pixel_meta || product.pixel_tiktok || product.pixel_gtm),
    ctr_ok: views ? ctr >= 0.02 : false,
    has_ab_test: !!abTest,
    is_active: product.active,
  };

  const score = Object.values(details).filter(Boolean).length * 12 + (details.ctr_ok ? 4 : 0);

  return NextResponse.json({ score: Math.min(100, score), details });
}
