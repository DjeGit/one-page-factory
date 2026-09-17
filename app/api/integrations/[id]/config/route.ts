import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { findDataSource, findSocialChannel } from '@/lib/integrations/registry';
import { isAuthorizedRequest } from '@/lib/admin-auth';

// Config NON sensible uniquement (ex. AWIN feed IDs par marché, région
// préférée...). Ne JAMAIS accepter de clé API ici — les clés restent en
// variables d'environnement serveur (cf. Sprint 0/3).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = findDataSource(params.id) || findSocialChannel(params.id);
  if (!client) return NextResponse.json({ error: 'Intégration inconnue' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const config = body.config;
  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'config (objet) requis' }, { status: 400 });
  }

  const forbiddenKeys = Object.keys(config).filter((k) => /key|secret|token|password/i.test(k));
  if (forbiddenKeys.length > 0) {
    return NextResponse.json(
      { error: `Les clés/secrets ne se configurent pas ici (${forbiddenKeys.join(', ')}) — utilise les variables d'environnement serveur.` },
      { status: 400 }
    );
  }

  await getSupabaseAdmin().from('integrations').update({ config }).eq('id', params.id);
  return NextResponse.json({ success: true });
}
