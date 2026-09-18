'use client';

import { useState } from 'react';
import type { Contact, Invoice, InvoiceLineItem } from '@/types';
import type { Market } from '@/lib/market';
import { MARKETS, DEFAULT_MARKET } from '@/lib/market';

interface InvoiceFormModalProps {
  invoice?: Invoice | null; // présent = édition d'un brouillon
  creditNoteOf?: Invoice | null; // présent = création d'un avoir sur cette facture
  contacts: Contact[];
  onClose: () => void;
  onSaved: (invoice: Invoice) => void;
}

interface FormState {
  contact_id: string;
  market: Market;
  due_at: string;
  notes: string;
  line_items: InvoiceLineItem[];
}

function emptyLine(): InvoiceLineItem {
  return { description: '', quantity: 1, unit_price: 0, tax_rate: 20 };
}

function initialState(invoice?: Invoice | null, creditNoteOf?: Invoice | null): FormState {
  if (invoice) {
    return {
      contact_id: invoice.contact_id,
      market: invoice.market,
      due_at: invoice.due_at ? invoice.due_at.slice(0, 10) : '',
      notes: invoice.notes ?? '',
      line_items: invoice.line_items.length ? invoice.line_items.map((l) => ({ ...l })) : [emptyLine()],
    };
  }
  if (creditNoteOf) {
    return {
      contact_id: creditNoteOf.contact_id,
      market: creditNoteOf.market,
      due_at: '',
      notes: '',
      line_items: creditNoteOf.line_items.length ? creditNoteOf.line_items.map((l) => ({ ...l })) : [emptyLine()],
    };
  }
  return { contact_id: '', market: DEFAULT_MARKET, due_at: '', notes: '', line_items: [emptyLine()] };
}

function contactLabel(c: Contact): string {
  return [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || c.company || c.email || c.id;
}

export default function InvoiceFormModal({ invoice, creditNoteOf, contacts, onClose, onSaved }: InvoiceFormModalProps) {
  const isEdit = !!invoice;
  const isCreditNote = !!creditNoteOf || invoice?.type === 'credit_note';
  const [form, setForm] = useState<FormState>(initialState(invoice, creditNoteOf));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setLine = (index: number, patch: Partial<InvoiceLineItem>) =>
    setForm((prev) => ({
      ...prev,
      line_items: prev.line_items.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    }));

  const addLine = () => setForm((prev) => ({ ...prev, line_items: [...prev.line_items, emptyLine()] }));
  const removeLine = (index: number) =>
    setForm((prev) => ({ ...prev, line_items: prev.line_items.filter((_, i) => i !== index) }));

  const subtotal = form.line_items.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
  const taxTotal = form.line_items.reduce((sum, l) => sum + l.quantity * l.unit_price * (l.tax_rate / 100), 0);
  const total = subtotal + taxTotal;
  const money = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.contact_id) {
      setError('Sélectionnez un contact');
      return;
    }
    const validLines = form.line_items.filter((l) => l.description.trim());
    if (validLines.length === 0) {
      setError('Ajoutez au moins une ligne avec une description');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        contact_id: form.contact_id,
        market: form.market,
        due_at: form.due_at || null,
        notes: form.notes,
        line_items: validLines,
      };
      if (creditNoteOf) {
        payload.type = 'credit_note';
        payload.credit_note_of = creditNoteOf.id;
      }
      const res = await fetch(isEdit ? `/api/invoices/${invoice!.id}` : '/api/invoices', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Une erreur est survenue');
        return;
      }
      onSaved(json.data as Invoice);
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-black text-gray-900">
            {isCreditNote ? (isEdit ? "Modifier l'avoir" : 'Nouvel avoir') : isEdit ? 'Modifier la facture' : 'Nouvelle facture'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {creditNoteOf && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800">
              Avoir sur la facture <strong>{creditNoteOf.invoice_number}</strong>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact</label>
              <select
                value={form.contact_id}
                onChange={(e) => set('contact_id', e.target.value)}
                disabled={!!creditNoteOf}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 disabled:bg-gray-50"
              >
                <option value="">Sélectionnez un contact…</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{contactLabel(c)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Marché</label>
              <select
                value={form.market}
                onChange={(e) => set('market', e.target.value as Market)}
                disabled={!!creditNoteOf}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 disabled:bg-gray-50"
              >
                {MARKETS.map((m) => (
                  <option key={m.code} value={m.code}>{m.flag} {m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Lignes</label>
            <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-400 px-1">
              <span className="col-span-5">Description</span>
              <span className="col-span-2">Qté</span>
              <span className="col-span-2">Prix unit. HT</span>
              <span className="col-span-2">TVA %</span>
            </div>
            <div className="space-y-2">
              {form.line_items.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => setLine(i, { description: e.target.value })}
                    placeholder="Description"
                    className="col-span-5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={line.quantity}
                    onChange={(e) => setLine(i, { quantity: Number(e.target.value) })}
                    className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) => setLine(i, { unit_price: Number(e.target.value) })}
                    className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={line.tax_rate}
                    onChange={(e) => setLine(i, { tax_rate: Number(e.target.value) })}
                    className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={form.line_items.length === 1}
                    className="col-span-1 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addLine} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">
              + Ajouter une ligne
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 flex justify-end">
            <div className="w-56 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Sous-total</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>TVA</span><span>{money(taxTotal)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>{money(total)}</span></div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Échéance</label>
            <input
              type="date"
              value={form.due_at}
              onChange={(e) => set('due_at', e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-gray-900"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer le brouillon' : 'Créer le brouillon'}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-right">
            Reste modifiable tant que c&apos;est un brouillon — le numéro officiel n&apos;est attribué qu&apos;à l&apos;envoi.
          </p>
        </form>
      </div>
    </div>
  );
}
