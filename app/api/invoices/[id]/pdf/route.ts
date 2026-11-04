import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { getInvoiceIssuer } from '@/lib/invoice-issuer';
import InvoiceDocument from '@/components/pdf/InvoiceDocument';
import type { Invoice } from '@/types';
import { dbErrorResponse, invalidId, isUuid, notFound, serverError, unauthorized } from '../../../_lib/http';

// @react-pdf/renderer utilise des API Node (buffers, streams) — pas
// compatible avec le runtime Edge.
export const runtime = 'nodejs';

const CONTACT_SELECT = 'id, first_name, last_name, company, email, phone, website, contact_type';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId('Identifiant de facture');
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('invoices')
    .select(`*, contact:email_leads(${CONTACT_SELECT})`)
    .eq('id', params.id)
    .maybeSingle();

  // Avant : toute erreur de base répondait « introuvable » (404), même une simple panne.
  if (error) return dbErrorResponse('GET /api/invoices/[id]/pdf', error);
  if (!data) return notFound('Facture introuvable');

  try {
    const invoice = data as Invoice;
    const issuer = getInvoiceIssuer();
    const buffer = await renderToBuffer(InvoiceDocument({ invoice, issuer }));
    // Nom de fichier : jamais de caractère pouvant casser l'en-tête HTTP (numéro libre, guillemets, retours ligne…).
    const base = invoice.invoice_number ?? `brouillon-${invoice.id.slice(0, 8)}`;
    const filename = `${String(base).replace(/[^A-Za-z0-9._-]+/g, '_')}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[api] GET /api/invoices/[id]/pdf (génération) :', err);
    return serverError('Impossible de générer le PDF (détail dans les logs serveur).');
  }
}
