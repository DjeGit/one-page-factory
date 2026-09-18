'use client';

import { useState } from 'react';
import type { Contact, ContactType } from '@/types';
import type { Market } from '@/lib/market';
import { DEFAULT_MARKET } from '@/lib/market';
import MarketFlagsPicker from './MarketFlagsPicker';

interface ContactFormModalProps {
  contact?: Contact | null; // présent = édition, absent = création
  onClose: () => void;
  onSaved: (contact: Contact) => void;
}

interface FormState {
  contact_type: ContactType;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  notes: string;
  markets: Market[];
}

function initialState(contact?: Contact | null): FormState {
  return {
    contact_type: contact?.contact_type === 'fournisseur' ? 'fournisseur' : 'client',
    first_name: contact?.first_name ?? '',
    last_name: contact?.last_name ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    company: contact?.company ?? '',
    website: contact?.website ?? '',
    notes: contact?.notes ?? '',
    markets: contact?.markets?.length ? contact.markets : [DEFAULT_MARKET],
  };
}

export default function ContactFormModal({ contact, onClose, onSaved }: ContactFormModalProps) {
  const isEdit = !!contact;
  const [form, setForm] = useState<FormState>(initialState(contact));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        manual: true,
        contact_type: form.contact_type,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        website: form.website,
        notes: form.notes,
        markets: form.markets,
      };
      const res = await fetch(isEdit ? `/api/leads/${contact!.id}` : '/api/leads', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Une erreur est survenue');
        return;
      }
      onSaved(json.data as Contact);
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-black text-gray-900">
            {isEdit ? 'Modifier le contact' : 'Nouveau contact'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Type de contact</label>
            <div className="flex gap-2">
              {(['client', 'fournisseur'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('contact_type', t)}
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors capitalize ${
                    form.contact_type === t
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {t === 'client' ? '🧑‍💼 Client' : '📦 Fournisseur'}
                </button>
              ))}
            </div>
          </div>

          {/* Nom / prénom */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prénom</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Email / téléphone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="contact@exemple.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Téléphone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-3">Au moins un email ou un téléphone est nécessaire.</p>

          {/* Société / URL */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Société</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Site web / URL</label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
                placeholder="https://…"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Marchés */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Marché(s) concerné(s)
            </label>
            <MarketFlagsPicker value={form.markets} onChange={(m) => set('markets', m)} />
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Commentaire</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Notes internes sur ce contact…"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || form.markets.length === 0}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Ajouter le contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
