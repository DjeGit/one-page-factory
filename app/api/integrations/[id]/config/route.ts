import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { findDataSource, findSocialChannel } from '@/lib/integrations/registry';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, dbErrorResponse, notFound, readJsonObject, unauthorized } from '../../../_lib/http';

const SECRET_KEY_RE = /key|secret|token|password/i;
const MAX_CONFIG_BYTES = 10_000;

/** Clés à l'allure de secret, à n'importe quelle profondeur (avant : premier niveau seulement). */
function findSecretKeys(value: unknown, path = ''): string[] {
  if (!value || typeof value !== 'object') return [];
  const found: string[] = [];
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const here = path ? `${path}.${k}` : k;
    if (SECRET_KEY_RE.test(k)) found.push(here);
    found.push(...findSecretKeys(v, here));
  }
  return found;
}

// Config NON sensible uniquement (ex. AWIN feed IDs par marché, région
// préférée...). Ne JAMAIS accepter de clé API ici — les clés restent en
// variables d'environnement serveur (cf. Sprint 0/3).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) return unauthorized();

  const client = findDataSource(params.id) || findSocialChannel(params.id);
  if (!client) return notFound('Intégration inconnue');

  const parsed = await readJsonObject(req);
  if ('response' in parsed) return parsed.response;
  const config = parsed.body.config;
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return badRequest('config (objet) requis');
  }
  if (JSON.stringify(config).length > MAX_CONFIG_BYTES) return badRequest('config trop volumineuse (10 Ko maximum)');

  const forbiddenKeys = findSecretKeys(config);
  if (forbiddenKeys.length > 0) {
    return badRequest(`Les clés/secrets ne se configurent pas ici (${forbiddenKeys.join(', ')}) — utilise les variables d'environnement serveur.`);
  }

  const { data, error } = await getSupabaseAdmin().from('integrations').update({ config }).eq('id', params.id).select('id');
  if (error) return dbErrorResponse('PATCH /api/integrations/[id]/config', error);
  if (!data || data.length === 0) return notFound("Cette intégration n'est pas enregistrée en base");
  return NextResponse.json({ success: true });
}
