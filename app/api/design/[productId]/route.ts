import { NextRequest, NextResponse } from 'next/server';
import { getProductById, updateProduct } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const product = await getProductById(params.productId);
    if (!product) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 });
    }
    return NextResponse.json({
      template_id: product.template_id || 'dark-pro',
      template_config: product.template_config || {},
    });
  } catch (error) {
    console.error('GET /api/design/[productId] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const body = await req.json();
    const { template_id, template_config } = body;

    if (!template_id) {
      return NextResponse.json({ error: 'template_id requis' }, { status: 400 });
    }

    const updated = await updateProduct(params.productId, {
      template_id,
      template_config,
    } as Parameters<typeof updateProduct>[1]);

    if (!updated) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template_id,
      template_config,
    });
  } catch (error) {
    console.error('POST /api/design/[productId] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
