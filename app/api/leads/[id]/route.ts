import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isValidMarket, type Market } from '@/lib/market';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, dbErrorResponse, invalidId, isUuid, notFound, readJsonObject, unauthorized } from '../../_lib/http';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();
  const sb = getSupabaseAdmin();
  // Avant : l'erreur était ignorée et la réponse était toujours « success ».
  const { data, error } = await sb.from('email_leads').delete().eq('id', params.id).select('id');
  if (error) return dbErrorResponse('DELETE /api/leads/[id]', error);
  if (!data || data.length === 0) return notFound('Contact introuvable');
  return NextResponse.json({ success: true });
}

// PUT /api/leads/[id] — édition d'un contact ajouté manuellement (client
// ou fournisseur) depuis le Répertoire : coordonnées, marchés, commentaire.
// Les leads capturés automatiquement (contact_type='lead') ne passent pas
// par cette route (pas d'UI d'édition prévue pour eux).
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();
  const sb = getSupabaseAdmin();
  const parsed = await readJsonObject(req);
  if ('response' in parsed) return parsed.response;
  const body = parsed.body;

  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;
  const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null;
  if (!email && !phone) return badRequest('Renseignez au moins un email ou un téléphone');
  if (email && !EMAIL_RE.test(email)) return badRequest('Email invalide');

  const markets: Market[] = Array.isArray(body.markets) ? body.markets.filter(isValidMarket) : [];
  if (markets.length === 0) return badRequest('Sélectionnez au moins un marché');

  if (body.contact_type !== 'client' && body.contact_type !== 'fournisseur' && body.contact_type !== 'partenaire') {
    return badRequest('Type de contact invalide (client, fournisseur ou partenaire)');
  }

  const { data, error } = await sb
    .from('email_leads')
    .update({
      contact_type: body.contact_type,
      email,
      phone,
      first_name: typeof body.first_name === 'string' ? body.first_name.trim() || null : null,
      last_name: typeof body.last_name === 'string' ? body.last_name.trim() || null : null,
      company: typeof body.company === 'string' ? body.company.trim() || null : null,
      website: typeof body.website === 'string' ? body.website.trim() || null : null,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      market: markets[0],
      markets,
    })
    .eq('id', params.id)
    .select()
    .maybeSingle();

  if (error) return dbErrorResponse('PUT /api/leads/[id]', error);
  if (!data) return notFound('Contact introuvable');
  return NextResponse.json({ success: true, data });
}
