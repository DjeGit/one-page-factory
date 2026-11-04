import { NextRequest, NextResponse } from 'next/server';
import { findDataSource, findSocialChannel } from '@/lib/integrations/registry';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { notFound, unauthorized } from '../../../_lib/http';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) return unauthorized();

  const client = findDataSource(params.id) || findSocialChannel(params.id);
  if (!client) return notFound('Intégration inconnue');

  try {
    const result = await client.testConnection();
    return NextResponse.json(result);
  } catch (err) {
    // Un échec de test est une réponse normale pour l'écran (ok: false), pas une panne serveur ;
    // le détail brut du fournisseur reste dans les logs.
    console.error(`[api] test de connexion ${params.id} :`, err);
    return NextResponse.json({ ok: false, message: 'Le test de connexion a échoué (détail dans les logs serveur).' }, { status: 502 });
  }
}
