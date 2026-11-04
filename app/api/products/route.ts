import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts, createProduct, generateSlug } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { isValidMarket } from '@/lib/market';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, readJsonObject, serverError, unauthorized } from '../_lib/http';
import { validateProductInput } from '../_lib/product-input';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  try {
    const marketParam = req.nextUrl.searchParams.get('market');
    const market = isValidMarket(marketParam) ? marketParam : getActiveMarket();
    const products = await getAllProducts(market);
    return NextResponse.json(products);
  } catch (error) {
    console.error('GET /api/products error:', error);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  try {
    const parsed = await readJsonObject(req);
    if ('response' in parsed) return parsed.response;

    // Valeurs vérifiées avant la base : marché fr/es/uk, lien http(s), livraison gratuite booléenne,
    // vidéo YouTube, identifiant AliExpress en chiffres… (voir _lib/product-input.ts)
    const checked = validateProductInput(parsed.body, 'create');
    if (!checked.ok) return badRequest(checked.error);
    const data = checked.data;

    // Generate slug if not provided
    if (!data.slug) {
      data.slug = generateSlug(data.name as string);
      if (!data.slug) return badRequest('Le nom du produit ne permet pas de fabriquer une adresse (slug) : ajoutez des lettres ou des chiffres');
    }

    const market = typeof data.market === 'string' && isValidMarket(data.market) ? data.market : getActiveMarket();
    const product = await createProduct({ ...data, market });

    if (!product) {
      return serverError('Erreur lors de la création du produit');
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('POST /api/products error:', error);
    return serverError();
  }
}
