'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Product } from '@/types';
import { MARKETS } from '@/lib/market';

interface NurturePreview {
  count: number;
  by_market: Record<string, number>;
  brevo_configured: boolean;
  markets_missing_list: string[];
}

interface NurtureEnrollPanelProps {
  products: Product[];
}

const SEQUENCES = [
  { key: 'default', label: 'Relance standard' },
];

// Panneau d'inscription en masse à la relance email — filtre les leads déjà
// capturés (contact_type='lead', jamais les contacts manuels), prévisualise
// le nombre concerné avant tout envoi, puis déclenche l'inscription réelle
// via /api/nurture/enroll. Ne montre aucun bouton d'envoi tant que
// BREVO_API_KEY n'est pas configurée côté serveur.
export default function NurtureEnrollPanel({ products }: NurtureEnrollPanelProps) {
  const [market, setMarket] = useState('');
  const [productId, setProductId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sequence, setSequence] = useState('default');

  const [preview, setPreview] = useState<NurturePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const fetchPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const params = new URLSearchParams();
      if (market) params.set('market', market);
      if (productId) params.set('product_id', productId);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const res = await fetch(`/api/nurture/enroll?${params}`);
      if (res.ok) setPreview(await res.json());
    } finally {
      setLoadingPreview(false);
    }
  }, [market, productId, dateFrom, dateTo]);

  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  const handleEnroll = async () => {
    if (!preview || preview.count === 0) return;
    if (!confirm(`Inscrire ${preview.count} lead(s) à la relance "${SEQUENCES.find(s => s.key === sequence)?.label}" ?`)) return;
    setEnrolling(true);
    setResult(null);
    try {
      const res = await fetch('/api/nurture/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market: market || undefined, product_id: productId || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined, sequence }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`Erreur : ${data.error ?? 'inconnue'}`);
      } else {
        setResult(`${data.enrolled} lead(s) inscrit(s)${data.skipped_no_list ? `, ${data.skipped_no_list} ignoré(s) (liste Brevo non configurée pour leur marché)` : ''}${data.failed ? `, ${data.failed} échec(s)` : ''}.`);
        fetchPreview();
      }
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Inscrire des leads à une relance</h2>
      <p className="text-sm text-gray-500 mb-5">
        Le message de bienvenue n&apos;est jamais renvoyé ici — cette relance utilise une liste Brevo dédiée, séparée de celle branchée sur la capture initiale.
      </p>

      {preview && !preview.brevo_configured && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-200">
          BREVO_API_KEY n&apos;est pas configurée côté serveur — l&apos;inscription est désactivée.
        </div>
      )}
      {preview && preview.brevo_configured && preview.markets_missing_list.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-200">
          Aucune liste de relance configurée pour : {preview.markets_missing_list.map((m) => m.toUpperCase()).join(', ')} (variable NURTURE_LIST_ID_{'{MARCHÉ}'} manquante). Les leads de ces marchés seront ignorés.
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Marché</label>
          <select value={market} onChange={(e) => setMarket(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm">
            <option value="">🌍 Tous les marchés</option>
            {MARKETS.map((m) => (<option key={m.code} value={m.code}>{m.flag} {m.label}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Produit</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm">
            <option value="">Tous les produits</option>
            {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Capturé depuis le</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Jusqu&apos;au</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Séquence</label>
          <select value={sequence} onChange={(e) => setSequence(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm">
            {SEQUENCES.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleEnroll}
          disabled={!preview || preview.count === 0 || !preview.brevo_configured || enrolling}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {enrolling ? 'Inscription…' : loadingPreview ? '…' : `Inscrire ${preview?.count ?? 0} lead(s)`}
        </button>
        {result && <p className="text-sm text-gray-600">{result}</p>}
      </div>
    </div>
  );
}
