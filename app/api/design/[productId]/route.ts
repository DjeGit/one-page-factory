import { NextRequest, NextResponse } from 'next/server';
import { getProductById, updateProduct } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { TEMPLATES } from '@/lib/templates';
import { badRequest, invalidId, isUuid, notFound, readJsonObject, serverError, unauthorized } from '../../_lib/http';

// Les réglages de design sont de petites valeurs (couleurs, polices…) : au-delà c'est une erreur ou un abus.
const MAX_CONFIG_BYTES = 20_000;

export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.productId)) return invalidId('Identifiant de produit');
  try {
    const product = await getProductById(params.productId);
    if (!product) return notFound('Produit non trouvé');
    return NextResponse.json({
      template_id: product.template_id || 'dark-pro',
      template_config: product.template_config || {},
    });
  } catch (error) {
    console.error('GET /api/design/[productId] error:', error);
    return serverError();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.productId)) return invalidId('Identifiant de produit');
  try {
    const parsed = await readJsonObject(req);
    if ('response' in parsed) return parsed.response;
    const { template_id, template_config } = parsed.body;

    if (!template_id || typeof template_id !== 'string') return badRequest('template_id requis');
    // Un modèle inconnu fait retomber la page produit sur un rendu par défaut sans prévenir : on le refuse.
    if (!TEMPLATES.some((t) => t.id === template_id)) return badRequest('Modèle de design inconnu');

    if (template_config !== undefined && template_config !== null) {
      if (typeof template_config !== 'object' || Array.isArray(template_config)) {
        return badRequest('template_config doit être un objet');
      }
      if (JSON.stringify(template_config).length > MAX_CONFIG_BYTES) return badRequest('template_config est trop volumineux');
    }

    const existing = await getProductById(params.productId);
    if (!existing) return notFound('Produit non trouvé');

    const updated = await updateProduct(params.productId, {
      template_id,
      template_config: template_config ?? {},
    } as Parameters<typeof updateProduct>[1]);

    if (!updated) return serverError('Erreur lors de la mise à jour');

    return NextResponse.json({
      success: true,
      template_id,
      template_config: template_config ?? {},
    });
  } catch (error) {
    console.error('POST /api/design/[productId] error:', error);
    return serverError();
  }
}
