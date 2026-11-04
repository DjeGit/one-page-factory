import { NextRequest, NextResponse } from 'next/server';
import { findDataSource, findSocialChannel } from '@/lib/integrations/registry';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, dbErrorResponse, notFound, readJsonObject, unauthorized } from '../../../_lib/http';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) return unauthorized();

  const client = findDataSource(params.id) || findSocialChannel(params.id);
  if (!client) return notFound('Intégration inconnue');

  const parsed = await readJsonObject(req);
  if ('response' in parsed) return parsed.response;
  // Avant : Boolean("false") valait true — une valeur texte activait l'intégration.
  if (typeof parsed.body.enabled !== 'boolean') return badRequest('enabled (booléen) requis');
  const enabled = parsed.body.enabled;

  if (enabled && !client.isConfigured()) {
    return badRequest(`Impossible d'activer "${client.displayName}" : variable(s) d'environnement manquante(s). Ajoute la clé API dans .env.local puis redémarre le serveur avant d'activer.`);
  }

  // Écriture contrôlée ici (le helper du registre ignorait l'erreur : « success » même si rien n'était enregistré).
  const { data, error } = await getSupabaseAdmin().from('integrations').update({ enabled }).eq('id', params.id).select('id');
  if (error) return dbErrorResponse('PATCH /api/integrations/[id]/toggle', error);
  if (!data || data.length === 0) return notFound("Cette intégration n'est pas enregistrée en base (migration du registre appliquée ?)");
  return NextResponse.json({ success: true, id: params.id, enabled });
}
