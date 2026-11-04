import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { dbErrorResponse, invalidId, isUuid, notFound, unauthorized } from '../../_lib/http';

// Score de qualité d'une fiche (outil d'admin). Avant : route PUBLIQUE qui chargeait toute la ligne
// produit (select *) et lançait 4 requêtes pour n'importe quel visiteur.
export async function GET(req: NextRequest, { params }: { params: { productId: string } }) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.productId)) return invalidId();
  const sb = getSupabaseAdmin();

  const [{ data: product, error }, { count: clicks }, { count: views }, { data: abTest }] = await Promise.all([
    sb.from('products')
      .select('image_url, images, hero_title, pain_points, price, affiliate_url, pixel_meta, pixel_tiktok, pixel_gtm, active')
      .eq('id', params.productId)
      .maybeSingle(),
    sb.from('clicks').select('*', { count: 'exact', head: true }).eq('product_id', params.productId),
    sb.from('page_views').select('*', { count: 'exact', head: true }).eq('product_id', params.productId),
    // .single() échouait dès que deux tests étaient actifs ; on veut seulement savoir s'il y en a un.
    sb.from('ab_tests').select('id').eq('product_id', params.productId).eq('active', true).limit(1).maybeSingle(),
  ]);

  if (error) return dbErrorResponse('GET /api/health-score/[productId]', error);
  if (!product) return notFound('Produit introuvable');

  const ctr = views && views > 0 ? (clicks || 0) / views : 0;

  const details = {
    has_image: !!(product.image_url || (Array.isArray(product.images) && product.images.length > 0)),
    has_ai_content: !!(product.hero_title && Array.isArray(product.pain_points) && product.pain_points.length > 0),
    has_price: !!product.price,
    has_affiliate_url: !!product.affiliate_url,
    has_pixel: !!(product.pixel_meta || product.pixel_tiktok || product.pixel_gtm),
    ctr_ok: views ? ctr >= 0.02 : false,
    has_ab_test: !!abTest,
    is_active: !!product.active,
  };

  const score = Object.values(details).filter(Boolean).length * 12 + (details.ctr_ok ? 4 : 0);

  return NextResponse.json({ score: Math.min(100, score), details });
}
