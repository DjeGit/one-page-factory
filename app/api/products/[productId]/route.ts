import { getSupabaseAdmin } from '@/lib/supabase';
import { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { productId: string } }
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.productId)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Produit introuvable' }, { status: 404 });
  }
  return Response.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Corps de la requête invalide' }, { status: 400 });
  }

  const ALLOWED = [
    'name', 'description', 'price', 'amazon_url', 'active',
    'hero_title', 'hero_subtitle', 'tiktok_script',
    'pain_points', 'benefits', 'faq', 'testimonials',
    'meta_title', 'meta_description', 'template_id', 'template_config',
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', params.productId)
    .select()
    .single();

  if (error) {
    console.error('[/api/products/[productId]] Update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}
