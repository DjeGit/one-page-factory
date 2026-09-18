import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Invoice } from '@/types';
import type { InvoiceIssuer } from '@/lib/invoice-issuer';
import { INVOICE_LEGAL_COPY } from '@/lib/invoice-legal-copy';
import { getMarketLabel } from '@/lib/market';

interface InvoiceDocumentProps {
  invoice: Invoice;
  issuer: InvoiceIssuer;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1f2937' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  issuerBlock: { maxWidth: 260 },
  issuerName: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
  muted: { color: '#6b7280' },
  docTitleBlock: { alignItems: 'flex-end' },
  docTitle: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  docNumber: { fontSize: 11, color: '#6b7280', marginBottom: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 9, color: '#6b7280' },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 9, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 4, letterSpacing: 0.5 },
  billToName: { fontSize: 11, fontWeight: 700 },
  table: { marginTop: 8, borderTop: '1px solid #e5e7eb' },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#6b7280',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottom: '1px solid #f3f4f6',
  },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1.4, textAlign: 'right' },
  colTax: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1.4, textAlign: 'right' },
  totalsBlock: { marginTop: 16, alignItems: 'flex-end' },
  totalsRow: { flexDirection: 'row', width: 220, justifyContent: 'space-between', paddingVertical: 2 },
  totalsRowFinal: {
    flexDirection: 'row',
    width: 220,
    justifyContent: 'space-between',
    paddingTop: 6,
    marginTop: 4,
    borderTop: '1px solid #e5e7eb',
    fontWeight: 700,
    fontSize: 11,
  },
  footer: { marginTop: 32, paddingTop: 12, borderTop: '1px solid #e5e7eb', fontSize: 8, color: '#9ca3af' },
  footerLine: { marginBottom: 3 },
});

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function InvoiceDocument({ invoice, issuer }: InvoiceDocumentProps) {
  const legal = INVOICE_LEGAL_COPY[invoice.market];
  const contact = invoice.contact;
  const contactName = contact
    ? [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim() || contact.company || contact.email || '—'
    : '—';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.issuerBlock}>
            <Text style={styles.issuerName}>{issuer.name}</Text>
            <Text style={styles.muted}>{issuer.address}</Text>
            {issuer.regNumber && <Text style={styles.muted}>{issuer.regNumber}</Text>}
            {issuer.vatNumber && <Text style={styles.muted}>TVA/VAT/IVA: {issuer.vatNumber}</Text>}
            {issuer.email && <Text style={styles.muted}>{issuer.email}</Text>}
          </View>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle}>{legal.documentLabel[invoice.type]}</Text>
            <Text style={styles.docNumber}>
              {invoice.invoice_number ?? `Brouillon — ${getMarketLabel(invoice.market)}`}
            </Text>
            <View style={styles.metaRow}>
              <Text>Émis le {formatDate(invoice.issued_at)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text>
                {legal.dueDateLabel} {formatDate(invoice.due_at)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{legal.billTo}</Text>
          <Text style={styles.billToName}>{contactName}</Text>
          {contact?.company && contactName !== contact.company && <Text>{contact.company}</Text>}
          {contact?.email && <Text style={styles.muted}>{contact.email}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qté</Text>
            <Text style={styles.colPrice}>Prix unit.</Text>
            <Text style={styles.colTax}>TVA</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {invoice.line_items.map((item, i) => {
            const lineTotal = item.quantity * item.unit_price * (1 + item.tax_rate / 100);
            return (
              <View style={styles.tableRow} key={i}>
                <Text style={styles.colDesc}>{item.description}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>{money(item.unit_price, invoice.currency)}</Text>
                <Text style={styles.colTax}>{item.tax_rate}%</Text>
                <Text style={styles.colTotal}>{money(lineTotal, invoice.currency)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Sous-total</Text>
            <Text>{money(invoice.subtotal, invoice.currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>TVA</Text>
            <Text>{money(invoice.tax_amount, invoice.currency)}</Text>
          </View>
          <View style={styles.totalsRowFinal}>
            <Text>Total</Text>
            <Text>{money(invoice.total, invoice.currency)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerLine}>
            {issuer.vatNumber ? `TVA/VAT/IVA: ${issuer.vatNumber}` : legal.vatExemptionNote}
          </Text>
          {legal.latePenaltyNote && <Text style={styles.footerLine}>{legal.latePenaltyNote}</Text>}
          {!issuer.configured && (
            <Text style={styles.footerLine}>
              ⚠️ Coordonnées d&apos;émetteur incomplètes — à renseigner dans .env.local
              (INVOICE_ISSUER_NAME / _ADDRESS / _REG_NUMBER) avant tout envoi officiel.
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
