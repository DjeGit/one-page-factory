import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { getInvoiceIssuer } from '@/lib/invoice-issuer';
import InvoiceDocument from '@/components/pdf/InvoiceDocument';
import type { Invoice } from '@/types';

// @react-pdf/renderer utilise des API Node (buffers, streams) — pas
// compatible avec le runtime Edge.
export const runtime = 'nodejs';

const CONTACT_SELECT = 'id, first_name, last_name, company, email, phone, website, contact_type';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('invoices')
    .select(`*, contact:email_leads(${CONTACT_SELECT})`)
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
  }

  const invoice = data as Invoice;
  const issuer = getInvoiceIssuer();
  const buffer = await renderToBuffer(InvoiceDocument({ invoice, issuer }));
  const filename = `${invoice.invoice_number ?? `brouillon-${invoice.id.slice(0, 8)}`}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
