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
import { badRequest, readJsonObject, serverError, unauthorized } from '../../_lib/http';
import { validateProductInput } from '../../_lib/product-input';

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();

  try {
    const parsed = await readJsonObject(req);
    if ('response' in parsed) return parsed.response;
    const body = parsed.body;

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length < 3) return badRequest('Le nom du produit est requis (3 caractères minimum).');

    const affiliateUrl = typeof body.affiliate_url === 'string' ? body.affiliate_url.trim() : '';
    if (!affiliateUrl) {
      return badRequest("L'URL du produit est requise et doit être une URL valide (http/https) — n'importe quel site, pas seulement Amazon.");
    }

    if (body.market !== undefined && body.market !== null && body.market !== '' && (typeof body.market !== 'string' || !isValidMarket(body.market))) {
      return badRequest('Marché invalide (fr, es ou uk)');
    }
    const market = typeof body.market === 'string' && isValidMarket(body.market) ? body.market : getActiveMarket();
    const productSource: 'manual_affiliate' | 'own_product' =
      body.product_source === 'own_product' ? 'own_product' : 'manual_affiliate';

    // Seuls les champs de ce formulaire sont retenus (le reste de la fiche se complète ensuite dans l'éditeur).
    const checked = validateProductInput({
      name,
      affiliate_url: affiliateUrl,
      description: typeof body.description === 'string' ? body.description : null,
      price: body.price,
      cost_price: body.cost_price,
      commission_rate: body.commission_rate,
      image_url: typeof body.image_url === 'string' && body.image_url.trim() ? body.image_url.trim() : null,
    }, 'create');
    if (!checked.ok) {
      // Un montant illisible est refusé clairement (avant : silencieusement remplacé par « vide »).
      return badRequest(checked.error);
    }

    const product = await createProduct({
      ...checked.data,
      slug: generateSlug(name),
      market,
      product_source: productSource,
      active: false, // brouillon par défaut — activation manuelle depuis la fiche produit
    });

    if (!product) return serverError('Erreur lors de la création du produit.');

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('POST /api/products/manual-add error:', error);
    return serverError();
  }
}
