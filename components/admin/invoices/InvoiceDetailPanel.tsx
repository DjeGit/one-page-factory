'use client';

import { useState } from 'react';
import type { Invoice } from '@/types';
import { getMarketLabel } from '@/lib/market';

interface InvoiceDetailPanelProps {
  invoice: Invoice;
  onClose: () => void;
  onEdit: () => void;
  onCreateCreditNote: () => void;
  onDelete: () => void;
  onStatusChanged: (invoice: Invoice) => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: '📝 Brouillon',
  sent: '📤 Envoyée',
  paid: '✅ Payée',
  cancelled: '🚫 Annulée',
};

const STATUS_BADGES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function InvoiceDetailPanel({
  invoice,
  onClose,
  onEdit,
  onCreateCreditNote,
  onDelete,
  onStatusChanged,
}: InvoiceDetailPanelProps) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contact = invoice.contact;
  const contactName = contact
    ? [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim() ||
      contact.company ||
      contact.email ||
      '—'
    : '—';

  const money = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: invoice.currency }).format(n);

  const changeStatus = async (status: string) => {
    setError(null);
    setUpdating(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Une erreur est survenue');
        return;
      }
      onStatusChanged(json.data as Invoice);
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between sticky top-0 bg-white">
          <div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${STATUS_BADGES[invoice.status]}`}>
              {STATUS_LABELS[invoice.status]}
            </span>
            <h2 className="text-xl font-black text-gray-900">
              {invoice.invoice_number ?? `Brouillon — ${getMarketLabel(invoice.market)}`}
            </h2>
            <p className="text-sm text-gray-500">{contactName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Lignes</h3>
            <div className="space-y-1.5">
              {invoice.line_items.map((l, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-700">
                  <span>{l.description} <span className="text-gray-400">×{l.quantity}</span></span>
                  <span>{money(l.quantity * l.unit_price * (1 + l.tax_rate / 100))}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Sous-total</span><span>{money(invoice.subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>TVA</span><span>{money(invoice.tax_amount)}</span></div>
            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>{money(invoice.total)}</span></div>
          </div>

          {invoice.due_at && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Échéance</h3>
              <p className="text-gray-900 text-sm">{new Date(invoice.due_at).toLocaleDateString('fr-FR')}</p>
            </div>
          )}

          {invoice.notes && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
            >
              Télécharger le PDF
            </a>

            {invoice.status === 'draft' && (
              <>
                <button onClick={onEdit} className="px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                  Modifier
                </button>
                <button
                  onClick={() => changeStatus('sent')}
                  disabled={updating}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
                >
                  {updating ? '...' : 'Envoyer (attribue le numéro)'}
                </button>
                <button onClick={onDelete} className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-50 font-semibold rounded-xl px-5 py-2.5 transition-colors">
                  Supprimer
                </button>
              </>
            )}

            {invoice.status === 'sent' && (
              <>
                <button
                  onClick={() => changeStatus('paid')}
                  disabled={updating}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
                >
                  Marquer payée
                </button>
                {invoice.type === 'invoice' && (
                  <button onClick={onCreateCreditNote} className="px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                    Créer un avoir
                  </button>
                )}
                <button
                  onClick={() => changeStatus('cancelled')}
                  disabled={updating}
                  className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-50 font-semibold rounded-xl px-5 py-2.5 transition-colors"
                >
                  Annuler
                </button>
              </>
            )}

            {invoice.status === 'paid' && invoice.type === 'invoice' && (
              <button onClick={onCreateCreditNote} className="px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                Créer un avoir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
