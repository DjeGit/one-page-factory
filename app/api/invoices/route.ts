import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isValidMarket, getCurrencyForMarket } from '@/lib/market';
import { computeInvoiceTotals } from '@/lib/invoices';
import { badRequest, dbErrorResponse, isUuid, readJsonObject, unauthorized } from '../_lib/http';
import { INVOICE_STATUSES, INVOICE_TYPES, parseDueDate, parseLineItems } from '../_lib/invoice-input';

const CONTACT_SELECT = 'id, first_name, last_name, company, email, contact_type';
const LIST_LIMIT = 1000;

// GET /api/invoices?market=fr&status=draft&type=invoice&contact_id=...
// Filtres optionnels, cumulables — écran Admin > Factures.
export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const sb = getSupabaseAdmin();
  const { searchParams } = req.nextUrl;
  const marketFilter = searchParams.get('market');
  const statusFilter = searchParams.get('status');
  const typeFilter = searchParams.get('type');
  const contactFilter = searchParams.get('contact_id');

  // Filtres inconnus = erreur claire (avant : ignorés pour le marché, transmis tels quels à la base pour les autres).
  if (statusFilter && !INVOICE_STATUSES.includes(statusFilter)) return badRequest('Statut invalide');
  if (typeFilter && !INVOICE_TYPES.includes(typeFilter)) return badRequest('Type de document invalide');
  if (contactFilter && !isUuid(contactFilter)) return badRequest('contact_id invalide');

  let query = sb
    .from('invoices')
    .select(`*, contact:email_leads(${CONTACT_SELECT})`)
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT);

  if (marketFilter && isValidMarket(marketFilter)) query = query.eq('market', marketFilter);
  if (statusFilter) query = query.eq('status', statusFilter);
  if (typeFilter) query = query.eq('type', typeFilter);
  if (contactFilter) query = query.eq('contact_id', contactFilter);

  const { data, error } = await query;
  if (error) return dbErrorResponse('GET /api/invoices', error);
  return NextResponse.json(data);
}

// POST — création d'un BROUILLON (facture ou avoir). Aucun numéro n'est
// attribué ici — voir lib/invoice-numbering.ts, appelé uniquement à la
// finalisation (PUT avec status: 'sent').
export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const sb = getSupabaseAdmin();
  const parsed = await readJsonObject(req);
  if ('response' in parsed) return parsed.response;
  const body = parsed.body;

  const type = body.type === 'credit_note' ? 'credit_note' : 'invoice';

  const contactId = typeof body.contact_id === 'string' && body.contact_id ? body.contact_id : null;
  if (!contactId) return badRequest('Un contact est requis');
  if (!isUuid(contactId)) return badRequest('Contact invalide');

  const market = isValidMarket(body.market as string) ? (body.market as 'fr' | 'es' | 'uk') : null;
  if (!market) return badRequest('Marché invalide');

  const lines = parseLineItems(body.line_items);
  if ('error' in lines) return badRequest(lines.error);
  if (lines.items.length === 0) return badRequest('Ajoutez au moins une ligne');

  if (type === 'credit_note' && (typeof body.credit_note_of !== 'string' || !isUuid(body.credit_note_of))) {
    return badRequest("Un avoir doit référencer la facture d'origine");
  }

  const dueAt = parseDueDate(body.due_at);
  if (dueAt === undefined) return badRequest("Date d'échéance invalide");
  if (typeof body.notes === 'string' && body.notes.length > 5000) return badRequest('Notes trop longues (5000 caractères maximum)');

  const totals = computeInvoiceTotals(lines.items);

  const { data, error } = await sb
    .from('invoices')
    .insert({
      type,
      contact_id: contactId,
      market,
      currency: getCurrencyForMarket(market),
      status: 'draft',
      line_items: lines.items,
      ...totals,
      due_at: dueAt,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      credit_note_of: type === 'credit_note' ? body.credit_note_of : null,
    })
    .select(`*, contact:email_leads(${CONTACT_SELECT})`)
    .single();

  if (error) return dbErrorResponse('POST /api/invoices', error);
  return NextResponse.json({ success: true, data });
}
