'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Contact, Invoice } from '@/types';
import { MARKETS } from '@/lib/market';
import InvoiceFormModal from './invoices/InvoiceFormModal';
import InvoiceDetailPanel from './invoices/InvoiceDetailPanel';

const STATUS_BADGES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  paid: 'Payée',
  cancelled: 'Annulée',
};

function contactLabel(c: Contact | Invoice['contact']): string {
  if (!c) return '—';
  return [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || c.company || c.email || '—';
}

export default function InvoicesManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const contactFilter = searchParams.get('contact_id') ?? '';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filterMarket, setFilterMarket] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [creditNoteOf, setCreditNoteOf] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMarket) params.set('market', filterMarket);
      if (filterStatus) params.set('status', filterStatus);
      if (contactFilter) params.set('contact_id', contactFilter);
      const res = await fetch(`/api/invoices?${params}`);
      if (res.ok) setInvoices(await res.json());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filterMarket, filterStatus, contactFilter]);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch('/api/leads');
      if (!res.ok) return;
      const data = await res.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce brouillon ? Cette action est irréversible.')) return;
    const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setInvoices((prev) => prev.filter((i) => i.id !== id));
      setSelectedInvoice(null);
    }
  };

  const clearContactFilter = () => router.push('/admin/invoices');

  const filteredContact = contactFilter ? contacts.find((c) => c.id === contactFilter) : null;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            Factures
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-primary-100 text-primary-700">
              {invoices.length}
            </span>
          </h1>
          <p className="text-gray-500 mt-1">
            {filteredContact ? (
              <>
                Factures de <strong>{contactLabel(filteredContact)}</strong>{' '}
                <button onClick={clearContactFilter} className="text-primary-600 hover:underline">
                  (voir toutes)
                </button>
              </>
            ) : (
              'Factures et avoirs, clients et fournisseurs, tous marchés'
            )}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle facture
        </button>
      </div>

      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <select
          value={filterMarket}
          onChange={(e) => setFilterMarket(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm"
        >
          <option value="">🌍 Tous les marchés</option>
          {MARKETS.map((m) => (
            <option key={m.code} value={m.code}>{m.flag} {m.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillons</option>
          <option value="sent">Envoyées</option>
          <option value="paid">Payées</option>
          <option value="cancelled">Annulées</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Chargement...</div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🧾</div>
            <p className="text-gray-500">Aucune facture pour le moment</p>
            <p className="text-sm text-gray-400 mt-1">Créez-en une depuis le bouton ci-dessus</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Numéro</th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Marché</th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="text-right px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => {
                  const market = MARKETS.find((m) => m.code === inv.market);
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <button onClick={() => setSelectedInvoice(inv)} className="font-medium text-gray-900 hover:text-primary-600 transition-colors text-left">
                          {inv.invoice_number ?? 'Brouillon'}
                        </button>
                        <div className="text-xs text-gray-400">{inv.type === 'credit_note' ? 'Avoir' : 'Facture'}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{contactLabel(inv.contact)}</td>
                      <td className="px-4 py-4">
                        <span title={market?.label} className="text-base leading-none">{market?.flag ?? inv.market}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${STATUS_BADGES[inv.status]}`}>
                          {STATUS_LABELS[inv.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: inv.currency }).format(inv.total)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(inv.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <InvoiceFormModal
          contacts={contacts}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchInvoices(); }}
        />
      )}

      {editingInvoice && (
        <InvoiceFormModal
          invoice={editingInvoice}
          contacts={contacts}
          onClose={() => setEditingInvoice(null)}
          onSaved={() => { setEditingInvoice(null); setSelectedInvoice(null); fetchInvoices(); }}
        />
      )}

      {creditNoteOf && (
        <InvoiceFormModal
          creditNoteOf={creditNoteOf}
          contacts={contacts}
          onClose={() => setCreditNoteOf(null)}
          onSaved={() => { setCreditNoteOf(null); setSelectedInvoice(null); fetchInvoices(); }}
        />
      )}

      {selectedInvoice && !editingInvoice && !creditNoteOf && (
        <InvoiceDetailPanel
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onEdit={() => setEditingInvoice(selectedInvoice)}
          onCreateCreditNote={() => setCreditNoteOf(selectedInvoice)}
          onDelete={() => handleDelete(selectedInvoice.id)}
          onStatusChanged={(updated) => {
            setSelectedInvoice(updated);
            setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          }}
        />
      )}
    </div>
  );
}
