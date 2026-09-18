/**
 * Coordonnées légales de l'émetteur des factures — à renseigner par Jerome
 * dans .env.local (voir .env.example), JAMAIS fabriquées ici. Tant
 * qu'elles ne sont pas renseignées, le PDF l'affiche clairement plutôt que
 * d'imprimer un faux SIRET/NIF ou une fausse adresse sur un document
 * légal.
 */
export interface InvoiceIssuer {
  name: string;
  address: string;
  /** SIRET (FR) / NIF (ES) / Company number (UK) — libellé générique. */
  regNumber: string;
  vatNumber: string;
  email: string;
  configured: boolean;
}

export function getInvoiceIssuer(): InvoiceIssuer {
  const name = process.env.INVOICE_ISSUER_NAME || '';
  const address = process.env.INVOICE_ISSUER_ADDRESS || '';
  const regNumber = process.env.INVOICE_ISSUER_REG_NUMBER || '';
  const vatNumber = process.env.INVOICE_ISSUER_VAT_NUMBER || '';
  const email = process.env.INVOICE_ISSUER_EMAIL || '';

  return {
    name: name || '⚠️ Émetteur non configuré (INVOICE_ISSUER_NAME)',
    address: address || 'Renseignez INVOICE_ISSUER_ADDRESS dans .env.local',
    regNumber,
    vatNumber,
    email,
    configured: Boolean(name && address && regNumber),
  };
}
