'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/types';

interface Props {
  initialCategories: Category[];
}

interface CategoryDraft {
  slug: string;
  name_fr: string;
  name_es: string;
  name_uk: string;
  icon: string;
  sort_order: string;
}

const emptyDraft: CategoryDraft = {
  slug: '',
  name_fr: '',
  name_es: '',
  name_uk: '',
  icon: '',
  sort_order: '0',
};

export default function CategoriesManager({ initialCategories }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CategoryDraft>(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<CategoryDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-gray-900';

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditDraft({
      slug: cat.slug,
      name_fr: cat.name_fr,
      name_es: cat.name_es,
      name_uk: cat.name_uk,
      icon: cat.icon || '',
      sort_order: String(cat.sort_order ?? 0),
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError(null);
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: editDraft.slug,
          name_fr: editDraft.name_fr,
          name_es: editDraft.name_es,
          name_uk: editDraft.name_uk,
          icon: editDraft.icon || null,
          sort_order: parseInt(editDraft.sort_order, 10) || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }
      const updated = await res.json();
      setCategories((prev) =>
        prev
          .map((c) => (c.id === id ? updated : c))
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      );
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Supprimer la catégorie "${cat.name_fr}" ? Les produits qui l'utilisent perdront leur catégorie.`)) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: newDraft.slug,
          name_fr: newDraft.name_fr,
          name_es: newDraft.name_es,
          name_uk: newDraft.name_uk,
          icon: newDraft.icon || null,
          sort_order: parseInt(newDraft.sort_order, 10) || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la création');
      }
      const created = await res.json();
      setCategories((prev) => [...prev, created].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      setCreating(false);
      setNewDraft(emptyDraft);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {error && (
        <div className="m-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-3">Icône</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Nom (FR)</th>
            <th className="px-4 py-3">Nom (ES)</th>
            <th className="px-4 py-3">Nom (UK)</th>
            <th className="px-4 py-3">Ordre</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {categories.map((cat) => {
            const isEditing = editingId === cat.id;
            return (
              <tr key={cat.id} className={isEditing ? 'bg-primary-50/30' : ''}>
                {isEditing ? (
                  <>
                    <td className="px-4 py-2">
                      <input className={inputClass} value={editDraft.icon} onChange={(e) => setEditDraft((d) => ({ ...d, icon: e.target.value }))} placeholder="📦" />
                    </td>
                    <td className="px-4 py-2">
                      <input className={inputClass} value={editDraft.slug} onChange={(e) => setEditDraft((d) => ({ ...d, slug: e.target.value }))} />
                    </td>
                    <td className="px-4 py-2">
                      <input className={inputClass} value={editDraft.name_fr} onChange={(e) => setEditDraft((d) => ({ ...d, name_fr: e.target.value }))} />
                    </td>
                    <td className="px-4 py-2">
                      <input className={inputClass} value={editDraft.name_es} onChange={(e) => setEditDraft((d) => ({ ...d, name_es: e.target.value }))} />
                    </td>
                    <td className="px-4 py-2">
                      <input className={inputClass} value={editDraft.name_uk} onChange={(e) => setEditDraft((d) => ({ ...d, name_uk: e.target.value }))} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" className={inputClass} value={editDraft.sort_order} onChange={(e) => setEditDraft((d) => ({ ...d, sort_order: e.target.value }))} />
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button disabled={saving} onClick={() => saveEdit(cat.id)} className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg mr-2 disabled:opacity-50">
                        Enregistrer
                      </button>
                      <button disabled={saving} onClick={cancelEdit} className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">
                        Annuler
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-lg">{cat.icon || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{cat.slug}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{cat.name_fr}</td>
                    <td className="px-4 py-3 text-gray-600">{cat.name_es}</td>
                    <td className="px-4 py-3 text-gray-600">{cat.name_uk}</td>
                    <td className="px-4 py-3 text-gray-500">{cat.sort_order}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => startEdit(cat)} className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 mr-2">
                        Modifier
                      </button>
                      <button disabled={saving} onClick={() => handleDelete(cat)} className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50">
                        Supprimer
                      </button>
                    </td>
                  </>
                )}
              </tr>
            );
          })}

          {creating && (
            <tr className="bg-green-50/30">
              <td className="px-4 py-2">
                <input className={inputClass} value={newDraft.icon} onChange={(e) => setNewDraft((d) => ({ ...d, icon: e.target.value }))} placeholder="🎯" />
              </td>
              <td className="px-4 py-2">
                <input className={inputClass} value={newDraft.slug} onChange={(e) => setNewDraft((d) => ({ ...d, slug: e.target.value }))} placeholder="ma-categorie" />
              </td>
              <td className="px-4 py-2">
                <input className={inputClass} value={newDraft.name_fr} onChange={(e) => setNewDraft((d) => ({ ...d, name_fr: e.target.value }))} placeholder="Nom en français" />
              </td>
              <td className="px-4 py-2">
                <input className={inputClass} value={newDraft.name_es} onChange={(e) => setNewDraft((d) => ({ ...d, name_es: e.target.value }))} placeholder="Nombre en español" />
              </td>
              <td className="px-4 py-2">
                <input className={inputClass} value={newDraft.name_uk} onChange={(e) => setNewDraft((d) => ({ ...d, name_uk: e.target.value }))} placeholder="Name in English" />
              </td>
              <td className="px-4 py-2">
                <input type="number" className={inputClass} value={newDraft.sort_order} onChange={(e) => setNewDraft((d) => ({ ...d, sort_order: e.target.value }))} />
              </td>
              <td className="px-4 py-2 text-right whitespace-nowrap">
                <button
                  disabled={saving || !newDraft.slug || !newDraft.name_fr || !newDraft.name_es || !newDraft.name_uk}
                  onClick={handleCreate}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg mr-2 disabled:opacity-50"
                >
                  Créer
                </button>
                <button
                  disabled={saving}
                  onClick={() => {
                    setCreating(false);
                    setNewDraft(emptyDraft);
                  }}
                  className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {!creating && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle catégorie
          </button>
        </div>
      )}
    </div>
  );
}
