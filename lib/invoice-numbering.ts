import type { SupabaseClient } from '@supabase/supabase-js';
import type { Market } from '@/lib/market';
import type { InvoiceType } from '@/types';

/**
 * Attribue un numéro de facture/avoir séquentiel — une suite par (marché,
 * année, type de document), jamais réutilisée. N'appeler qu'à la
 * finalisation d'un document (passage 'draft' → 'sent'), jamais à la
 * création d'un brouillon : un brouillon supprimé ne doit pas laisser de
 * trou dans la séquence (obligation légale française de numérotation
 * continue, art. 289 CGI).
 *
 * L'incrément est atomique côté base (fonction SQL next_invoice_number,
 * voir supabase/migrations/20260918000007_invoices.sql) — un simple
 * lecture-puis-écriture côté application risquerait une collision entre
 * deux finalisations concurrentes.
 */
export async function generateInvoiceNumber(
  sb: SupabaseClient,
  market: Market,
  docType: InvoiceType,
  year: number = new Date().getFullYear()
): Promise<string> {
  const { data, error } = await sb.rpc('next_invoice_number', {
    p_market: market,
    p_year: year,
    p_doc_type: docType,
  });
  if (error || data == null) {
    throw new Error(error?.message || 'Échec de génération du numéro de facture');
  }
  const formatted = String(data).padStart(6, '0');
  return `${market.toUpperCase()}-${year}-${formatted}`;
}
