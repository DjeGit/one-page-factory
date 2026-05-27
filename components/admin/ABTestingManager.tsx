'use client';

import { useState } from 'react';
import type { ABTest, Product } from '@/types';

interface ABTestingManagerProps {
  initialTests: ABTest[];
  products: Product[];
}

type TabType = 'active' | 'ended';

export default function ABTestingManager({ initialTests, products }: ABTestingManagerProps) {
  const [tests, setTests] = useState<ABTest[]>(initialTests);
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState<ABTest | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [loading, setLoading] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState({
    product_id: '',
    name: '',
    variant_a_title: '',
    variant_a_subtitle: '',
    variant_a_cta: 'Commander maintenant',
    variant_b_title: '',
    variant_b_subtitle: '',
    variant_b_cta: 'Découvrir le produit',
  });

  const openCreate = () => {
    setSaveError('');
    setEditingTest(null);
    setForm({
      product_id: '',
      name: '',
      variant_a_title: '',
      variant_a_subtitle: '',
      variant_a_cta: 'Commander maintenant',
      variant_b_title: '',
      variant_b_subtitle: '',
      variant_b_cta: 'Découvrir le produit',
    });
    setShowModal(true);
  };

  const openEdit = (test: ABTest) => {
    setEditingTest(test);
    setForm({
      product_id: test.product_id,
      name: test.name,
      variant_a_title: test.variant_a_title,
      variant_a_subtitle: test.variant_a_subtitle,
      variant_a_cta: test.variant_a_cta,
      variant_b_title: test.variant_b_title,
      variant_b_subtitle: test.variant_b_subtitle,
      variant_b_cta: test.variant_b_cta,
    });
    setShowModal(true);
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setForm(prev => ({
      ...prev,
      product_id: productId,
      variant_a_title: product?.hero_title || product?.name || '',
      variant_a_subtitle: product?.hero_subtitle || '',
      variant_a_cta: 'Commander maintenant',
    }));
  };

  const handleSubmit = async () => {
    setLoading('saving');
    try {
      const url = editingTest ? `/api/ab-test/${editingTest.id}` : '/api/ab-test';
      const method = editingTest ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      if (editingTest) {
        setTests(prev => prev.map(t => t.id === editingTest.id ? data : t));
      } else {
        setTests(prev => [...prev, data]);
      }
      setShowModal(false);
    } catch {
      setSaveError('Une erreur est survenue. Vérifiez vos données et réessayez.');
    } finally {
      setLoading(null);
    }
  };

  const handleAction = async (testId: string, action: 'winner_a' | 'winner_b' | 'archive' | 'delete') => {
    setLoading(testId + action);
    try {
      if (action === 'delete') {
        const res = await fetch(`/api/ab-test/${testId}`, { method: 'DELETE' });
        if (res.ok) setTests(prev => prev.filter(t => t.id !== testId));
      } else {
        const body = action === 'archive'
          ? { active: false }
          : { winner: action === 'winner_a' ? 'a' : 'b', active: false };
        const res = await fetch(`/api/ab-test/${testId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setTests(prev => prev.map(t => t.id === testId ? data : t));
        }
      }
    } finally {
      setLoading(null);
    }
  };

  const getCTR = (clicks: number, views: number) =>
    views > 0 ? ((clicks / views) * 100) : 0;

  const getStatusBadge = (test: ABTest) => {
    if (test.winner) {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Gagnant détecté</span>;
    }
    if (!test.active) {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Terminé</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Actif</span>;
  };

  const getWinnerBanner = (test: ABTest) => {
    const ctrA = getCTR(test.variant_a_clicks, test.variant_a_views);
    const ctrB = getCTR(test.variant_b_clicks, test.variant_b_views);
    const totalViews = test.variant_a_views + test.variant_b_views;
    if (totalViews < 200) return null;
    if (test.winner) {
      return (
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm font-semibold text-yellow-800">
          🏆 Variante {test.winner.toUpperCase()} gagne !
        </div>
      );
    }
    const diff = Math.abs(ctrA - ctrB);
    if (diff >= 20 && test.variant_a_views > 100 && test.variant_b_views > 100) {
      const winner = ctrA > ctrB ? 'A' : 'B';
      return (
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm font-semibold text-yellow-800">
          🏆 Variante {winner} gagne !
        </div>
      );
    }
    return null;
  };

  const getSignificance = (test: ABTest) => {
    const total = test.variant_a_views + test.variant_b_views;
    const ctrA = getCTR(test.variant_a_clicks, test.variant_a_views);
    const ctrB = getCTR(test.variant_b_clicks, test.variant_b_views);
    if (total > 200 && Math.abs(ctrA - ctrB) > 15) {
      return (
        <div className="mt-2 text-xs text-green-700 font-semibold">
          ✅ Résultat statistiquement significatif
        </div>
      );
    }
    return null;
  };

  const filteredTests = tests.filter(t =>
    activeTab === 'active' ? t.active : !t.active
  );

  const productName = (id: string) => products.find(p => p.id === id)?.name || id;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">A/B Testing</h1>
          <p className="text-gray-500 mt-1">Optimisez vos pages avec des tests comparatifs</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau test
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {(['active', 'ended'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all -mb-px ${
              activeTab === tab
                ? 'bg-white border border-b-white border-gray-200 text-primary-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'active' ? 'Tests actifs' : 'Tests terminés'}
          </button>
        ))}
      </div>

      {/* Test cards */}
      {filteredTests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <div className="text-4xl mb-3">🔬</div>
          <p className="text-gray-500">Aucun test {activeTab === 'active' ? 'actif' : 'terminé'} pour le moment</p>
          {activeTab === 'active' && (
            <button
              onClick={openCreate}
              className="mt-4 text-primary-600 font-medium hover:text-primary-700"
            >
              Créer votre premier test →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTests.map((test) => {
            const ctrA = getCTR(test.variant_a_clicks, test.variant_a_views);
            const ctrB = getCTR(test.variant_b_clicks, test.variant_b_views);
            const maxCTR = Math.max(ctrA, ctrB, 1);

            return (
              <div key={test.id} className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-900">{test.name}</h3>
                      {getStatusBadge(test)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {productName(test.product_id)} · Créé le {new Date(test.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(test)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Modifier
                    </button>
                  </div>
                </div>

                {/* Variants comparison */}
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  {/* Variant A */}
                  <div className={`rounded-xl border-2 p-4 ${test.winner === 'a' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Variante A</span>
                      {test.winner === 'a' && <span className="text-xs">🏆</span>}
                    </div>
                    <p className="font-semibold text-gray-800 text-sm truncate">{test.variant_a_title}</p>
                    <p className="text-xs text-gray-500 truncate mb-3">{test.variant_a_subtitle}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-black text-gray-900">{test.variant_a_views.toLocaleString('fr-FR')}</div>
                        <div className="text-xs text-gray-400">Vues</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-gray-900">{test.variant_a_clicks.toLocaleString('fr-FR')}</div>
                        <div className="text-xs text-gray-400">Clics</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-primary-600">{ctrA.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">CTR</div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${(ctrA / maxCTR) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Variant B */}
                  <div className={`rounded-xl border-2 p-4 ${test.winner === 'b' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Variante B</span>
                      {test.winner === 'b' && <span className="text-xs">🏆</span>}
                    </div>
                    <p className="font-semibold text-gray-800 text-sm truncate">{test.variant_b_title}</p>
                    <p className="text-xs text-gray-500 truncate mb-3">{test.variant_b_subtitle}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-black text-gray-900">{test.variant_b_views.toLocaleString('fr-FR')}</div>
                        <div className="text-xs text-gray-400">Vues</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-gray-900">{test.variant_b_clicks.toLocaleString('fr-FR')}</div>
                        <div className="text-xs text-gray-400">Clics</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-orange-600">{ctrB.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">CTR</div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full transition-all"
                        style={{ width: `${(ctrB / maxCTR) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {getWinnerBanner(test)}
                {getSignificance(test)}

                {/* Actions */}
                {test.active && !test.winner && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleAction(test.id, 'winner_a')}
                      disabled={loading === test.id + 'winner_a'}
                      className="px-3 py-1.5 text-xs font-semibold bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors disabled:opacity-50"
                    >
                      Déclarer gagnant A
                    </button>
                    <button
                      onClick={() => handleAction(test.id, 'winner_b')}
                      disabled={loading === test.id + 'winner_b'}
                      className="px-3 py-1.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
                    >
                      Déclarer gagnant B
                    </button>
                    <button
                      onClick={() => handleAction(test.id, 'archive')}
                      disabled={loading === test.id + 'archive'}
                      className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Archiver
                    </button>
                    <button
                      onClick={() => handleAction(test.id, 'delete')}
                      disabled={loading === test.id + 'delete'}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-black text-gray-900">
                {editingTest ? 'Modifier le test' : 'Nouveau test A/B'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Produit</label>
                <select
                  value={form.product_id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                >
                  <option value="">Sélectionner un produit...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom du test</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                  placeholder="Ex: Test titre principal"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                {/* Variant A */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-primary-700 uppercase tracking-wider">Variante A</h3>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Titre</label>
                    <input
                      type="text"
                      value={form.variant_a_title}
                      onChange={(e) => setForm(prev => ({ ...prev, variant_a_title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Sous-titre</label>
                    <textarea
                      value={form.variant_a_subtitle}
                      onChange={(e) => setForm(prev => ({ ...prev, variant_a_subtitle: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm resize-none"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Texte CTA</label>
                    <input
                      type="text"
                      value={form.variant_a_cta}
                      onChange={(e) => setForm(prev => ({ ...prev, variant_a_cta: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm"
                    />
                  </div>
                </div>

                {/* Variant B */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider">Variante B</h3>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Titre</label>
                    <input
                      type="text"
                      value={form.variant_b_title}
                      onChange={(e) => setForm(prev => ({ ...prev, variant_b_title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Sous-titre</label>
                    <textarea
                      value={form.variant_b_subtitle}
                      onChange={(e) => setForm(prev => ({ ...prev, variant_b_subtitle: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm resize-none"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Texte CTA</label>
                    <input
                      type="text"
                      value={form.variant_b_cta}
                      onChange={(e) => setForm(prev => ({ ...prev, variant_b_cta: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm"
                    />
                  </div>
                </div>
              </div>

              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {saveError}
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading === 'saving' || !form.product_id || !form.name}
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading === 'saving' ? 'Sauvegarde...' : editingTest ? 'Modifier' : 'Créer le test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
