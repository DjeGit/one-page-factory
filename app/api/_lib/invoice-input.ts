/** Validation partagée des factures / avoirs (création et brouillon modifié). */
import { sanitizeLineItems } from '@/lib/invoices';
import type { InvoiceLineItem } from '@/types';
import { isIsoDate } from './http';

export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'cancelled'];
export const INVOICE_TYPES = ['invoice', 'credit_note'];
const MAX_LINES = 200;

/** Lignes nettoyées (lib/invoices.ts) après contrôle du nombre de lignes envoyées. */
export function parseLineItems(raw: unknown): { items: InvoiceLineItem[] } | { error: string } {
  if (Array.isArray(raw) && raw.length > MAX_LINES) return { error: `${MAX_LINES} lignes maximum par document` };
  const items = sanitizeLineItems(raw).map((i) => ({ ...i, description: i.description.slice(0, 1000) }));
  return { items };
}

/** Échéance : AAAA-MM-JJ (ou date ISO complète) -> AAAA-MM-JJ ; null si vide ; undefined si invalide. */
export function parseDueDate(v: unknown): string | null | undefined {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') return undefined;
  const day = v.slice(0, 10);
  return isIsoDate(day) ? v : undefined;
}
