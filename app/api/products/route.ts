import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts, createProduct, generateSlug } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { isValidMarket } from '@/lib/market';
import { isAuthorizedRequest } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const marketParam = req.nextUrl.searchParams.get('market');
    const market = isValidMarket(marketParam) ? marketParam : getActiveMarket();
    const products = await getAllProducts(market);
    return NextResponse.json(products);
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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

    const product = await createProduct({ ...body, market: body.market || getActiveMarket() });

    if (!product) {
      return NextResponse.json({ error: 'Erreur lors de la création du produit' }, { status: 500 });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('POST /api/products error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
