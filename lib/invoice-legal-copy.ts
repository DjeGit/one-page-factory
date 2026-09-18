import type { Market } from '@/lib/market';

interface InvoiceLegalCopy {
  documentLabel: { invoice: string; credit_note: string };
  billTo: string;
  /** Affiché quand aucun numéro de TVA n'est configuré pour l'émetteur. */
  vatExemptionNote: string;
  paymentTermsLabel: string;
  dueDateLabel: string;
  /** Pénalité de retard — spécifique FR (art. L441-10 C. com.), vide ailleurs. */
  latePenaltyNote: string;
}

// Textes fixes des mentions légales par marché — voir le rapport "OPF —
// Compléments à prévoir" (18/09) pour le détail des obligations FR/ES/UK.
// Ce ne sont PAS des données variables (contrairement à lib/invoice-issuer.ts
// qui dépend de l'entité de Jerome) : elles ne changent pas d'une facture à
// l'autre, seulement selon le marché du document.
export const INVOICE_LEGAL_COPY: Record<Market, InvoiceLegalCopy> = {
  fr: {
    documentLabel: { invoice: 'Facture', credit_note: 'Avoir' },
    billTo: 'Facturé à',
    vatExemptionNote: 'TVA non applicable, art. 293 B du CGI.',
    paymentTermsLabel: 'Conditions de paiement',
    dueDateLabel: "Date d'échéance",
    latePenaltyNote:
      "En cas de retard de paiement, une pénalité ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement sont exigibles (art. L441-10 du Code de commerce).",
  },
  es: {
    documentLabel: { invoice: 'Factura', credit_note: 'Factura rectificativa' },
    billTo: 'Facturado a',
    vatExemptionNote: 'Operación exenta de IVA.',
    paymentTermsLabel: 'Condiciones de pago',
    dueDateLabel: 'Fecha de vencimiento',
    latePenaltyNote: '',
  },
  uk: {
    documentLabel: { invoice: 'Invoice', credit_note: 'Credit note' },
    billTo: 'Billed to',
    vatExemptionNote: 'VAT not applicable.',
    paymentTermsLabel: 'Payment terms',
    dueDateLabel: 'Due date',
    latePenaltyNote: '',
  },
};
