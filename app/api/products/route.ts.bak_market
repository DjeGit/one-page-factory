import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts, createProduct, generateSlug } from '@/lib/supabase';

export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || !body.affiliate_url) {
      return NextResponse.json(
        { error: 'Le nom et l\'URL d\'affiliation sont requis' },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    if (!body.slug) {
      body.slug = generateSlug(body.name);
    }

    const product = await createProduct(body);

    if (!product) {
      return NextResponse.json({ error: 'Erreur lors de la création du produit' }, { status: 500 });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('POST /api/products error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
