import { NextRequest, NextResponse } from 'next/server';
import { setIntegrationEnabled, findDataSource, findSocialChannel } from '@/lib/integrations/registry';
import { isAuthorizedRequest } from '@/lib/admin-auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = findDataSource(params.id) || findSocialChannel(params.id);
  if (!client) return NextResponse.json({ error: 'Intégration inconnue' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const enabled = Boolean(body.enabled);

  if (enabled && !client.isConfigured()) {
    return NextResponse.json(
      { error: `Impossible d'activer "${client.displayName}" : variable(s) d'environnement manquante(s). Ajoute la clé API dans .env.local puis redémarre le serveur avant d'activer.` },
      { status: 400 }
    );
  }

  await setIntegrationEnabled(params.id, enabled);
  return NextResponse.json({ success: true, id: params.id, enabled });
}
