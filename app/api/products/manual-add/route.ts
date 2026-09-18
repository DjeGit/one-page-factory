/**
 * /api/products/manual-add (Sprint 4)
 *
 * Ajout manuel d'un produit à tout moment, INDÉPENDANT de l'étude de
 * marché (exigence explicite de Jerome) — n'importe quelle URL affiliée
 * (pas seulement Amazon), ou un produit vendu en propre.
 *
 * POST body :
 *   { name: string, affiliate_url: string, market?: Market,
 *     product_source?: 'manual_affiliate' | 'own_product',
 *     description?, price?, image_url?, cost_price?, commission_rate? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createProduct, generateSlug } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { isValidMarket } from '@/lib/market';
import { isAuthorizedRequest } from '@/lib/admin-auth';

function isLikelyUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const affiliateUrl = typeof body.affiliate_url === 'string' ? body.affiliate_url.trim() : '';

  if (!name || name.length < 3) {
    return NextResponse.json({ error: 'Le nom du produit est requis (3 caractères minimum).' }, { status: 400 });
  }
  if (!affiliateUrl || !isLikelyUrl(affiliateUrl)) {
    return NextResponse.json(
      { error: "L'URL du produit est requise et doit être une URL valide (http/https) — n'importe quel site, pas seulement Amazon." },
      { status: 400 }
    );
  }

  const market = isValidMarket(body.market) ? body.market : getActiveMarket();
  const productSource: 'manual_affiliate' | 'own_product' =
    body.product_source === 'own_product' ? 'own_product' : 'manual_affiliate';

  const price = body.price != null && body.price !== '' ? Number(body.price) : null;
  const costPrice = body.cost_price != null && body.cost_price !== '' ? Number(body.cost_price) : null;
  const commissionRate = body.commission_rate != null && body.commission_rate !== '' ? Number(body.commission_rate) : null;

  const product = await createProduct({
    name,
    slug: generateSlug(name),
    affiliate_url: affiliateUrl,
    description: typeof body.description === 'string' ? body.description : null,
    price: Number.isFinite(price as number) ? price : null,
    image_url: typeof body.image_url === 'string' && body.image_url ? body.image_url : null,
    market,
    product_source: productSource,
    cost_price: Number.isFinite(costPrice as number) ? costPrice : null,
    commission_rate: Number.isFinite(commissionRate as number) ? commissionRate : null,
    active: false, // brouillon par défaut — activation manuelle depuis la fiche produit
  });

  if (!product) {
    return NextResponse.json({ error: "Erreur lors de la création du produit." }, { status: 500 });
  }

  return NextResponse.json(product, { status: 201 });
}
