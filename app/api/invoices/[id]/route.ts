import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isValidMarket } from '@/lib/market';
import { computeInvoiceTotals, sanitizeLineItems } from '@/lib/invoices';
import { generateInvoiceNumber } from '@/lib/invoice-numbering';

const CONTACT_SELECT = 'id, first_name, last_name, company, email, phone, website, contact_type';

// Transitions de statut autorisées UNE FOIS le document finalisé (status
// !== 'draft') — jamais de retour en arrière vers 'draft'.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  sent: ['paid', 'cancelled'],
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(_req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('invoices')
    .select(`*, contact:email_leads(${CONTACT_SELECT})`)
    .eq('id', params.id)
    .single();
  if (error || !data) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
  return NextResponse.json(data);
}

// PUT — deux usages distincts selon l'état actuel du document :
//  - brouillon : édition normale du contenu (lignes, contact, marché...),
//    ou finalisation en passant status: 'sent' (attribue le numéro légal) ;
//  - déjà finalisé : SEULE une transition de statut est acceptée (sent →
//    paid/cancelled) — le contenu d'un document numéroté ne se modifie
//    plus, pour préserver son intégrité légale. Une correction passe par
//    un avoir (nouvelle facture type: 'credit_note'), pas une édition.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const body = await req.json();

  const { data: current, error: fetchError } = await sb
    .from('invoices')
    .select('*')
    .eq('id', params.id)
    .single();
  if (fetchError || !current) {
    return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
  }

  const requestedStatus = typeof body.status === 'string' ? body.status : undefined;

  if (current.status !== 'draft') {
    if (!requestedStatus || requestedStatus === current.status) {
      return NextResponse.json(
        { error: 'Ce document est finalisé et ne peut plus être modifié' },
        { status: 400 }
      );
    }
    if (!ALLOWED_TRANSITIONS[current.status]?.includes(requestedStatus)) {
      return NextResponse.json(
        { error: `Transition ${current.status} → ${requestedStatus} non autorisée` },
        { status: 400 }
      );
    }
    const { data, error } = await sb
      .from('invoices')
      .update({ status: requestedStatus })
      .eq('id', params.id)
      .select(`*, contact:email_leads(${CONTACT_SELECT})`)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data });
  }

  // Brouillon : édition de contenu, avec recalcul serveur des totaux.
  const market = isValidMarket(body.market) ? body.market : current.market;
  const lineItems = body.line_items !== undefined ? sanitizeLineItems(body.line_items) : current.line_items;
  if (lineItems.length === 0) {
    return NextResponse.json({ error: 'Ajoutez au moins une ligne' }, { status: 400 });
  }
  const totals = computeInvoiceTotals(lineItems);

  const update: Record<string, unknown> = {
    contact_id: typeof body.contact_id === 'string' && body.contact_id ? body.contact_id : current.contact_id,
    market,
    line_items: lineItems,
    ...totals,
    due_at: body.due_at !== undefined ? (body.due_at || null) : current.due_at,
    notes: body.notes !== undefined
      ? (typeof body.notes === 'string' ? body.notes.trim() || null : null)
      : current.notes,
  };

  if (requestedStatus === 'sent') {
    update.invoice_number = await generateInvoiceNumber(sb, market, current.type);
    update.status = 'sent';
    update.issued_at = new Date().toISOString();
  } else if (requestedStatus === 'cancelled') {
    update.status = 'cancelled';
  }

  const { data, error } = await sb
    .from('invoices')
    .update(update)
    .eq('id', params.id)
    .select(`*, contact:email_leads(${CONTACT_SELECT})`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, data });
}

// DELETE — uniquement les brouillons (jamais numérotés). Un document
// finalisé s'annule (status: 'cancelled' via PUT) ou se corrige par un
// avoir, il ne se supprime jamais.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const { data: current } = await sb.from('invoices').select('status').eq('id', params.id).single();
  if (!current) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
  if (current.status !== 'draft') {
    return NextResponse.json(
      { error: 'Seuls les brouillons peuvent être supprimés — annulez ce document à la place' },
      { status: 400 }
    );
  }
  const { error } = await sb.from('invoices').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
