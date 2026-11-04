import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isValidMarket } from '@/lib/market';
import { computeInvoiceTotals } from '@/lib/invoices';
import { generateInvoiceNumber } from '@/lib/invoice-numbering';
import { badRequest, dbErrorResponse, invalidId, isUuid, notFound, readJsonObject, unauthorized } from '../../_lib/http';
import { parseDueDate, parseLineItems } from '../../_lib/invoice-input';

const CONTACT_SELECT = 'id, first_name, last_name, company, email, phone, website, contact_type';

// Transitions de statut autorisées UNE FOIS le document finalisé (status
// !== 'draft') — jamais de retour en arrière vers 'draft'.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  sent: ['paid', 'cancelled'],
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId('Identifiant de facture');
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('invoices')
    .select(`*, contact:email_leads(${CONTACT_SELECT})`)
    .eq('id', params.id)
    .maybeSingle();
  if (error) return dbErrorResponse('GET /api/invoices/[id]', error);
  if (!data) return notFound('Facture introuvable');
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
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId('Identifiant de facture');
  const sb = getSupabaseAdmin();
  const parsed = await readJsonObject(req);
  if ('response' in parsed) return parsed.response;
  const body = parsed.body;

  const { data: current, error: fetchError } = await sb
    .from('invoices')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (fetchError) return dbErrorResponse('PUT /api/invoices/[id] (lecture)', fetchError);
  if (!current) return notFound('Facture introuvable');

  const requestedStatus = typeof body.status === 'string' ? body.status : undefined;
  // Un brouillon ne peut devenir que « sent » (finalisation) ou « cancelled » ; tout autre statut
  // (ex. « paid » sur un brouillon, valeur inconnue) était avalé en silence et la route répondait « success ».
  if (current.status === 'draft' && requestedStatus !== undefined && !['draft', 'sent', 'cancelled'].includes(requestedStatus)) {
    return badRequest(`Un brouillon ne peut pas passer au statut « ${requestedStatus} »`);
  }

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
      .eq('status', current.status) // le statut lu plus haut doit encore être le statut en base
      .select(`*, contact:email_leads(${CONTACT_SELECT})`)
      .single();
    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json({ error: 'Le statut de ce document a changé entre-temps — rechargez la page.' }, { status: 409 });
      }
      return dbErrorResponse('PUT /api/invoices/[id] (statut)', error);
    }
    return NextResponse.json({ success: true, data });
  }

  // Brouillon : édition de contenu, avec recalcul serveur des totaux.
  if (body.market !== undefined && !isValidMarket(body.market as string)) return badRequest('Marché invalide');
  const market = isValidMarket(body.market as string) ? (body.market as 'fr' | 'es' | 'uk') : current.market;
  let lineItems = current.line_items ?? [];
  if (body.line_items !== undefined) {
    const lines = parseLineItems(body.line_items);
    if ('error' in lines) return badRequest(lines.error);
    lineItems = lines.items;
  }
  if (lineItems.length === 0) {
    return badRequest('Ajoutez au moins une ligne');
  }
  const totals = computeInvoiceTotals(lineItems);

  if (typeof body.contact_id === 'string' && body.contact_id && !isUuid(body.contact_id)) return badRequest('Contact invalide');
  let dueAt = current.due_at;
  if (body.due_at !== undefined) {
    const parsedDue = parseDueDate(body.due_at);
    if (parsedDue === undefined) return badRequest("Date d'échéance invalide");
    dueAt = parsedDue;
  }
  if (typeof body.notes === 'string' && body.notes.length > 5000) return badRequest('Notes trop longues (5000 caractères maximum)');

  const update: Record<string, unknown> = {
    contact_id: typeof body.contact_id === 'string' && body.contact_id ? body.contact_id : current.contact_id,
    market,
    line_items: lineItems,
    ...totals,
    due_at: dueAt,
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

  // Audit 21/09 (bug HIGH corrigé) : la vérification current.status === 'draft'
  // ci-dessus (ligne 55) est faite AVANT le calcul du numéro de facture —
  // deux requêtes de finalisation quasi simultanées (double-clic) peuvent
  // toutes les deux passer cette vérification et consommer chacune un
  // numéro de séquence légal, laissant un trou. Le .eq('status', 'draft')
  // ci-dessous rend l'écriture finale atomique : seule la première des deux
  // requêtes trouve encore une ligne 'draft' à mettre à jour, la seconde ne
  // touche aucune ligne (PGRST116 sur .single()) et échoue proprement —
  // mais a déjà consommé un numéro de séquence pour rien. C'est un trou de
  // séquence évité pour la facture, au prix (accepté) d'un numéro
  // occasionnellement "sauté" en cas de double-clic réel, jamais réutilisé
  // ni dupliqué — cohérent avec l'exigence légale de continuité.
  const { data, error } = await sb
    .from('invoices')
    .update(update)
    .eq('id', params.id)
    .eq('status', 'draft')
    .select(`*, contact:email_leads(${CONTACT_SELECT})`)
    .single();

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Ce document a déjà été finalisé entre-temps (double clic ou autre onglet) — rechargez la page.' },
        { status: 409 }
      );
    }
    return dbErrorResponse('PUT /api/invoices/[id]', error);
  }
  return NextResponse.json({ success: true, data });
}

// DELETE — uniquement les brouillons (jamais numérotés). Un document
// finalisé s'annule (status: 'cancelled' via PUT) ou se corrige par un
// avoir, il ne se supprime jamais.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId('Identifiant de facture');
  const sb = getSupabaseAdmin();
  // Suppression conditionnelle en UNE requête : avant, lecture du statut puis suppression séparées —
  // une facture finalisée entre les deux (autre onglet) aurait pu être supprimée, numéro légal perdu.
  const { data: deleted, error } = await sb.from('invoices').delete().eq('id', params.id).eq('status', 'draft').select('id');
  if (error) return dbErrorResponse('DELETE /api/invoices/[id]', error);
  if (deleted && deleted.length > 0) return NextResponse.json({ success: true });

  const { data: current } = await sb.from('invoices').select('status').eq('id', params.id).maybeSingle();
  if (!current) return notFound('Facture introuvable');
  return badRequest('Seuls les brouillons peuvent être supprimés — annulez ce document à la place');
}
