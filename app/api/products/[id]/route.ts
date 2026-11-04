import { NextRequest, NextResponse } from 'next/server';
import { getProductById, updateProduct, deleteProduct } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { syncActivation } from '@/lib/market-sync';
import { clearTtlCache } from '@/lib/ttl-cache';
import { badRequest, invalidId, isUuid, notFound, readJsonObject, serverError, unauthorized } from '../../_lib/http';
import { validateProductInput } from '../../_lib/product-input';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId('Identifiant de produit');
  try {
    const product = await getProductById(params.id);
    if (!product) return notFound('Produit non trouvé');
    return NextResponse.json(product);
  } catch (error) {
    console.error('GET /api/products/[id] error:', error);
    return serverError();
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId('Identifiant de produit');
  try {
    const parsed = await readJsonObject(req);
    if ('response' in parsed) return parsed.response;

    const checked = validateProductInput(parsed.body, 'update');
    if (!checked.ok) return badRequest(checked.error);
    const data = checked.data;

    // État actuel : 404 propre si la fiche n'existe pas (avant : 500), et base de comparaison pour l'activation.
    const before = await getProductById(params.id);
    if (!before) return notFound('Produit non trouvé');

    // Mettre en ligne une fiche sans lien d'achat créerait une page avec un bouton mort.
    if (data.active === true && !before.active) {
      const link = 'affiliate_url' in data ? data.affiliate_url : before.affiliate_url;
      if (typeof link !== 'string' || !link.trim()) {
        return NextResponse.json({ error: "Impossible de mettre cette fiche en ligne : le lien d'affiliation est vide." }, { status: 409 });
      }
    }

    const product = await updateProduct(params.id, data);
    if (!product) return serverError('Erreur lors de la mise à jour');

    // Activer/désactiver un produit sur un marché le fait suivre sur les autres marchés (lib/market-sync.ts).
    // La modification elle-même est déjà enregistrée : un échec de propagation est signalé sans la faire passer pour échouée.
    if (typeof data.active === 'boolean' && before.active !== data.active) {
      try {
        const sync = await syncActivation({ id: product.id, source_product_ref: product.source_product_ref ?? null }, data.active);
        clearTtlCache(); // les autres marchés ont pu changer : les catégories visibles sont recalculées
        return NextResponse.json({ ...product, sync });
      } catch (syncError) {
        console.error('PUT /api/products/[id] (propagation aux autres marchés) :', syncError);
        return NextResponse.json({
          ...product,
          sync: { activated: [], deactivated: [], skipped: [] },
          sync_error: "La fiche est enregistrée, mais la propagation aux autres marchés a échoué : vérifiez-les un par un.",
        });
      }
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('PUT /api/products/[id] error:', error);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId('Identifiant de produit');
  try {
    const success = await deleteProduct(params.id);

    if (!success) return serverError('Erreur lors de la suppression');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error);
    return serverError();
  }
}
