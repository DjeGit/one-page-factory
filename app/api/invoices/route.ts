import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isValidMarket, getCurrencyForMarket } from '@/lib/market';
import { computeInvoiceTotals, sanitizeLineItems } from '@/lib/invoices';

const CONTACT_SELECT = 'id, first_name, last_name, company, email, contact_type';

// GET /api/invoices?market=fr&status=draft&type=invoice&contact_id=...
// Filtres optionnels, cumulables — écran Admin > Factures.
export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const { searchParams } = req.nextUrl;
  const marketFilter = searchParams.get('market');
  const statusFilter = searchParams.get('status');
  const typeFilter = searchParams.get('type');
  const contactFilter = searchParams.get('contact_id');

  let query = sb
    .from('invoices')
    .select(`*, contact:email_leads(${CONTACT_SELECT})`)
    .order('created_at', { ascending: false });

  if (marketFilter && isValidMarket(marketFilter)) query = query.eq('market', marketFilter);
  if (statusFilter) query = query.eq('status', statusFilter);
  if (typeFilter) query = query.eq('type', typeFilter);
  if (contactFilter) query = query.eq('contact_id', contactFilter);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// POST — création d'un BROUILLON (facture ou avoir). Aucun numéro n'est
// attribué ici — voir lib/invoice-numbering.ts, appelé uniquement à la
// finalisation (PUT avec status: 'sent').
export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const body = await req.json();

  const type = body.type === 'credit_note' ? 'credit_note' : 'invoice';

  const contactId = typeof body.contact_id === 'string' && body.contact_id ? body.contact_id : null;
  if (!contactId) {
    return NextResponse.json({ error: 'Un contact est requis' }, { status: 400 });
  }

  const market = isValidMarket(body.market) ? body.market : null;
  if (!market) {
    return NextResponse.json({ error: 'Marché invalide' }, { status: 400 });
  }

  const lineItems = sanitizeLineItems(body.line_items);
  if (lineItems.length === 0) {
    return NextResponse.json({ error: 'Ajoutez au moins une ligne' }, { status: 400 });
  }

  if (type === 'credit_note' && (typeof body.credit_note_of !== 'string' || !body.credit_note_of)) {
    return NextResponse.json({ error: "Un avoir doit référencer la facture d'origine" }, { status: 400 });
  }

  const totals = computeInvoiceTotals(lineItems);

  const { data, error } = await sb
    .from('invoices')
    .insert({
      type,
      contact_id: contactId,
      market,
      currency: getCurrencyForMarket(market),
      status: 'draft',
      line_items: lineItems,
      ...totals,
      due_at: typeof body.due_at === 'string' && body.due_at ? body.due_at : null,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      credit_note_of: type === 'credit_note' ? body.credit_note_of : null,
    })
    .select(`*, contact:email_leads(${CONTACT_SELECT})`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, data });
}
