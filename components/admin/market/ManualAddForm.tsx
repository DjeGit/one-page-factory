'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMarket } from '@/lib/market-context';
import { getMarketLabel } from '@/lib/market';

/**
 * Ajout manuel de produit (Sprint 4) — indépendant de l'étude de marché,
 * accepte n'importe quelle URL affiliée (pas seulement Amazon) ou un
 * produit vendu en propre. Poste vers /api/products/manual-add.
 */
export default function ManualAddForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const { market } = useMarket();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; name: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    affiliate_url: '',
    description: '',
    price: '',
    image_url: '',
    product_source: 'manual_affiliate' as 'manual_affiliate' | 'own_product',
    cost_price: '',
    commission_rate: '',
  });

  const update = (field: keyof typeof form, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/products/manual-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: form.price || null,
          cost_price: form.cost_price || null,
          commission_rate: form.commission_rate ? Number(form.commission_rate) / 100 : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Erreur lors de la création du produit.');
        return;
      }
      setSuccess({ id: json.id, name: json.name });
      setForm({
        name: '',
        affiliate_url: '',
        description: '',
        price: '',
        image_url: '',
        product_source: 'manual_affiliate',
        cost_price: '',
        commission_rate: '',
      });
      onCreated?.();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Ajouter un produit manuellement
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900">Ajouter un produit manuellement</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            N&apos;importe quelle URL affiliée (pas seulement Amazon), ou un produit vendu en propre — pour le marché{' '}
            <strong>{getMarketLabel(market)}</strong>.
          </p>
        </div>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-sm">
          Fermer
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2 flex gap-2">
          <button
            type="button"
            onClick={() => update('product_source', 'manual_affiliate')}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold border ${
              form.product_source === 'manual_affiliate'
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'border-gray-200 text-gray-500'
            }`}
          >
            Lien d&apos;affiliation
          </button>
          <button
            type="button"
            onClick={() => update('product_source', 'own_product')}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold border ${
              form.product_source === 'own_product'
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'border-gray-200 text-gray-500'
            }`}
          >
            Produit vendu en propre
          </button>
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Nom du produit *</label>
          <input
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {form.product_source === 'own_product' ? 'URL de la page produit *' : "URL affiliée *"}
          </label>
          <input
            required
            type="url"
            placeholder="https://..."
            value={form.affiliate_url}
            onChange={(e) => update('affiliate_url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Prix de vente</label>
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => update('price', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Image (URL)</label>
          <input
            type="url"
            value={form.image_url}
            onChange={(e) => update('image_url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Coût d&apos;achat <span className="text-gray-300">(pour le calcul coût/gain, Sprint 5)</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={form.cost_price}
            onChange={(e) => update('cost_price', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Commission (%)</label>
          <input
            type="number"
            step="0.1"
            value={form.commission_rate}
            onChange={(e) => update('commission_rate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
        {success && (
          <div className="col-span-2 flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700">
            <span>« {success.name} » créé en brouillon.</span>
            <button
              type="button"
              onClick={() => router.push(`/admin/products/${success.id}`)}
              className="font-semibold underline"
            >
              Ouvrir la fiche →
            </button>
          </div>
        )}

        <div className="col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {submitting ? 'Création...' : 'Créer le produit'}
          </button>
        </div>
      </form>
    </div>
  );
}
