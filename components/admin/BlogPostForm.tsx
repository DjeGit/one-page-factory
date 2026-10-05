'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import '@uiw/react-md-editor/markdown-editor.css';
import type { BlogPost, Product } from '@/types';
import type { Market } from '@/lib/market';
import { slugifyBlogTitle } from '@/lib/slugify';

// MDEditor touche `window`/`navigator` au chargement — import dynamique
// sans SSR, comme tout composant d'édition riche dans un App Router
// (évite une erreur "window is not defined" au build).
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface BlogPostFormProps {
  post?: BlogPost;
  mode: 'create' | 'edit';
  products: Pick<Product, 'id' | 'name' | 'slug'>[];
}

const MARKETS: { value: Market; label: string }[] = [
  { value: 'fr', label: 'France (tendpick.fr)' },
  { value: 'es', label: 'Espagne (tendpick.es)' },
  { value: 'uk', label: 'International (tendpick.com)' },
];

export default function BlogPostForm({ post, mode, products }: BlogPostFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Génération IA — sujet/angle saisis à part, jamais sauvegardés tels
  // quels : ils ne servent qu'à pré-remplir le formulaire, que l'on relit
  // et corrige avant d'enregistrer (voir Sprint 3, app/api/blog/generate).
  const [aiSubject, setAiSubject] = useState('');
  const [aiAngle, setAiAngle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: post?.title || '',
    slug: post?.slug || '',
    market: post?.market || ('fr' as Market),
    excerpt: post?.excerpt || '',
    content: post?.content || '',
    cover_image_url: post?.cover_image_url || '',
    status: post?.status || 'draft',
    tags: post?.tags?.join(', ') || '',
    linked_product_ids: post?.linked_product_ids || ([] as string[]),
    author_name: post?.author_name || 'Jerome',
    meta_title: post?.meta_title || '',
    meta_description: post?.meta_description || '',
    generated_by_ai: post?.generated_by_ai || false,
  });

  const handleChange = (field: string, value: string | boolean | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTitleBlur = () => {
    if (!form.slug && form.title) {
      handleChange('slug', slugifyBlogTitle(form.title));
    }
  };

  const toggleProduct = (id: string) => {
    setForm((prev) => ({
      ...prev,
      linked_product_ids: prev.linked_product_ids.includes(id)
        ? prev.linked_product_ids.filter((p) => p !== id)
        : [...prev.linked_product_ids, id],
    }));
  };

  const handleGenerateDraft = async () => {
    if (!aiSubject.trim()) {
      setAiError('Indique un sujet pour générer un brouillon.');
      return;
    }
    setGenerating(true);
    setAiError(null);
    try {
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: aiSubject, angle: aiAngle, market: form.market }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la génération');
      }
      const draft = await res.json();
      // Pré-remplit SANS sauvegarder ni publier — relecture obligatoire
      // avant tout enregistrement, exactement comme pour les one-pages
      // produit.
      setForm((prev) => ({
        ...prev,
        title: draft.title || prev.title,
        slug: prev.slug || slugifyBlogTitle(draft.title || ''),
        excerpt: draft.excerpt || prev.excerpt,
        content: draft.content || prev.content,
        meta_title: draft.meta_title || prev.meta_title,
        meta_description: draft.meta_description || prev.meta_description,
        tags: Array.isArray(draft.tags) ? draft.tags.join(', ') : prev.tags,
        generated_by_ai: true,
      }));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: form.title,
        slug: form.slug || slugifyBlogTitle(form.title),
        market: form.market,
        excerpt: form.excerpt,
        content: form.content,
        cover_image_url: form.cover_image_url,
        status: form.status,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        linked_product_ids: form.linked_product_ids,
        author_name: form.author_name,
        meta_title: form.meta_title,
        meta_description: form.meta_description,
        generated_by_ai: form.generated_by_ai,
      };

      if (!payload.title || !payload.content) {
        throw new Error('Le titre et le contenu sont requis.');
      }

      const url = mode === 'edit' ? `/api/blog/${post!.id}` : '/api/blog';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/blog');
        router.refresh();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5';

  const selectedProducts = useMemo(
    () => products.filter((p) => form.linked_product_ids.includes(p.id)),
    [products, form.linked_product_ids]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Génération IA — toujours un brouillon à relire, jamais publié automatiquement */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-primary-900">🤖 Générer un brouillon IA</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={aiSubject}
            onChange={(e) => setAiSubject(e.target.value)}
            className={inputClass}
            placeholder="Sujet (ex: Les écouteurs à réduction de bruit en 2026)"
          />
          <input
            type="text"
            value={aiAngle}
            onChange={(e) => setAiAngle(e.target.value)}
            className={inputClass}
            placeholder="Angle (optionnel, ex: comparatif petit budget)"
          />
        </div>
        <button
          type="button"
          onClick={handleGenerateDraft}
          disabled={generating}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60"
        >
          {generating ? 'Génération en cours...' : 'Générer un brouillon'}
        </button>
        {aiError && <p className="text-red-600 text-sm">{aiError}</p>}
        <p className="text-xs text-primary-700">
          Pré-remplit le formulaire ci-dessous — rien n&apos;est sauvegardé ni publié automatiquement, relis et corrige avant d&apos;enregistrer.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Titre *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            onBlur={handleTitleBlur}
            className={inputClass}
            placeholder="Ex: 5 accessoires tech à moins de 30€ en 2026"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Slug URL</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => handleChange('slug', e.target.value)}
            className={inputClass}
            placeholder="Auto-généré depuis le titre"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Marché</label>
          <select
            value={form.market}
            onChange={(e) => handleChange('market', e.target.value)}
            className={inputClass}
          >
            {MARKETS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Blog lancé en français — les autres marchés ouvriront plus tard.</p>
        </div>
        <div>
          <label className={labelClass}>Statut</label>
          <select
            value={form.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className={inputClass}
          >
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Extrait</label>
        <textarea
          value={form.excerpt}
          onChange={(e) => handleChange('excerpt', e.target.value)}
          className={`${inputClass} resize-y min-h-[70px]`}
          placeholder="Résumé affiché dans la liste des articles et sur l'accueil"
        />
      </div>

      <div>
        <label className={labelClass}>Contenu (markdown) *</label>
        <div data-color-mode="light">
          <MDEditor
            value={form.content}
            onChange={(v) => handleChange('content', v || '')}
            height={420}
            preview="live"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Image de couverture (URL)</label>
          <input
            type="text"
            value={form.cover_image_url}
            onChange={(e) => handleChange('cover_image_url', e.target.value)}
            className={inputClass}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className={labelClass}>Tags (séparés par des virgules)</label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => handleChange('tags', e.target.value)}
            className={inputClass}
            placeholder="produits tendance, high-tech"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Produits liés (affichés dans l&apos;article)</label>
        {selectedProducts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedProducts.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-primary-100 text-primary-800">
                {p.name}
                <button type="button" onClick={() => toggleProduct(p.id)} className="hover:text-primary-900">×</button>
              </span>
            ))}
          </div>
        )}
        <select
          value=""
          onChange={(e) => e.target.value && toggleProduct(e.target.value)}
          className={inputClass}
        >
          <option value="">+ Ajouter un produit...</option>
          {products
            .filter((p) => !form.linked_product_ids.includes(p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Auteur</label>
          <input
            type="text"
            value={form.author_name}
            onChange={(e) => handleChange('author_name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Meta title (SEO)</label>
          <input
            type="text"
            value={form.meta_title}
            onChange={(e) => handleChange('meta_title', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Meta description (SEO)</label>
        <textarea
          value={form.meta_description}
          onChange={(e) => handleChange('meta_description', e.target.value)}
          className={`${inputClass} resize-y min-h-[60px]`}
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm font-semibold">Enregistré ✓</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
        >
          {saving ? 'Enregistrement...' : mode === 'edit' ? 'Mettre à jour' : 'Créer l’article'}
        </button>
      </div>
    </form>
  );
}
