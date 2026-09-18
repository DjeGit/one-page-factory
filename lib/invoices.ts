import type { InvoiceLineItem } from '@/types';

export interface InvoiceTotals {
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Recalcule TOUJOURS les totaux côté serveur à partir des lignes — on ne
 * fait jamais confiance à un total envoyé par le client. `tax_rate` au
 * niveau du document est un taux moyen pondéré (affichage), le détail réel
 * est par ligne dans `line_items`.
 */
export function computeInvoiceTotals(lineItems: InvoiceLineItem[]): InvoiceTotals {
  let subtotal = 0;
  let taxAmount = 0;
  for (const item of lineItems) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const rate = Number(item.tax_rate) || 0;
    const lineSubtotal = qty * price;
    subtotal += lineSubtotal;
    taxAmount += lineSubtotal * (rate / 100);
  }
  subtotal = round2(subtotal);
  taxAmount = round2(taxAmount);
  const total = round2(subtotal + taxAmount);
  const taxRate = subtotal > 0 ? round2((taxAmount / subtotal) * 100) : 0;
  return { subtotal, tax_rate: taxRate, tax_amount: taxAmount, total };
}

/** Valide/nettoie les lignes envoyées par le client ; ignore toute ligne sans description. */
export function sanitizeLineItems(raw: unknown): InvoiceLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): InvoiceLineItem | null => {
      if (typeof item !== 'object' || item === null) return null;
      const r = item as Record<string, unknown>;
      const description = typeof r.description === 'string' ? r.description.trim() : '';
      if (!description) return null;
      const quantity = Number(r.quantity);
      const unitPrice = Number(r.unit_price);
      const taxRate = Number(r.tax_rate);
      return {
        description,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        unit_price: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0,
        tax_rate: Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : 0,
      };
    })
    .filter((x): x is InvoiceLineItem => x !== null);
}
