import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isValidMarket, type Market } from '@/lib/market';
import { isAuthorizedRequest } from '@/lib/admin-auth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  await sb.from('email_leads').delete().eq('id', params.id);
  return NextResponse.json({ success: true });
}

// PUT /api/leads/[id] — édition d'un contact ajouté manuellement (client
// ou fournisseur) depuis le Répertoire : coordonnées, marchés, commentaire.
// Les leads capturés automatiquement (contact_type='lead') ne passent pas
// par cette route (pas d'UI d'édition prévue pour eux).
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const body = await req.json();

  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;
  const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null;
  if (!email && !phone) {
    return NextResponse.json({ error: 'Renseignez au moins un email ou un téléphone' }, { status: 400 });
  }
  if (email && !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
  }

  const markets: Market[] = Array.isArray(body.markets) ? body.markets.filter(isValidMarket) : [];
  if (markets.length === 0) {
    return NextResponse.json({ error: 'Sélectionnez au moins un marché' }, { status: 400 });
  }

  if (body.contact_type !== 'client' && body.contact_type !== 'fournisseur' && body.contact_type !== 'partenaire') {
    return NextResponse.json({ error: 'Type de contact invalide (client, fournisseur ou partenaire)' }, { status: 400 });
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
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, data });
}
