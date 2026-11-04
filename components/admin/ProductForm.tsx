'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import GenerateButton from './GenerateButton';
import type { Product, GeneratedContent, Category } from '@/types';
import { TEMPLATES } from '@/lib/templates';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import { getYouTubeId } from '@/lib/video';
import type { Market } from '@/lib/market';
import { categoryName, publicUrl, summarizeSync, type SyncReport } from '@/lib/admin-products-view';
import { networkErrorMessage, readApiError } from '@/components/admin/http';

interface ProductFormProps {
  product?: Product;
  mode: 'create' | 'edit';
  initialTemplateId?: string;
  categories?: Category[];
  /** Pré-remplissage à la création (ex. depuis l'Étude de marché). */
  prefill?: { name?: string; description?: string; price?: string };
  /** Marché du produit : celui du produit en modification, le marché actif de l'admin en création. */
  market?: Market;
}

function isValidJson(str: string): boolean {
  if (!str.trim()) return true;
  try { JSON.parse(str); return true; } catch { return false; }
}

/** Un champ JSON vide est traité comme une liste vide (avant : accepté à l'écran puis refusé à l'enregistrement). */
function parseJsonList(str: string): unknown {
  return str.trim() ? JSON.parse(str) : [];
}

const JSON_FIELD_LABELS: Record<string, string> = {
  pain_points: 'Points de douleur',
  benefits: 'Bénéfices',
  faq: 'FAQ',
  testimonials: 'Témoignages',
};

export default function ProductForm({ product, mode, initialTemplateId, categories = [], prefill, market: marketProp }: ProductFormProps) {
  const router = useRouter();
  const market: Market = product?.market ?? marketProp ?? 'fr';
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ text: string; blocked: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'ai' | 'seo' | 'marketing' | 'design'>('basic');

  const [form, setForm] = useState({
    name: product?.name || prefill?.name || '',
    description: product?.description || prefill?.description || '',
    price: product?.price?.toString() || prefill?.price || '',
    original_price: product?.original_price?.toString() || '',
    cost_price: product?.cost_price?.toString() || '',
    ad_spend_allocated: product?.ad_spend_allocated?.toString() || '',
    commission_rate: product?.commission_rate != null ? String(Math.round(product.commission_rate * 1000) / 10) : '',
    affiliate_url: product?.affiliate_url || '',
    video_url: product?.video_url || '',
    price_currency: product?.price_currency || '',
    price_checked_at: product?.price_checked_at?.slice(0, 10) || '',
    free_shipping: product?.free_shipping ?? false,
    active: product?.active ?? true,
    slug: product?.slug || '',
    category_id: product?.category_id || '',
    hero_title: product?.hero_title || '',
    hero_subtitle: product?.hero_subtitle || '',
    pain_points: product?.pain_points ? JSON.stringify(product.pain_points, null, 2) : '[]',
    benefits: product?.benefits ? JSON.stringify(product.benefits, null, 2) : '[]',
    faq: product?.faq ? JSON.stringify(product.faq, null, 2) : '[]',
    tiktok_script: product?.tiktok_script || '',
    testimonials: product?.testimonials ? JSON.stringify(product.testimonials, null, 2) : '[]',
    meta_title: product?.meta_title || '',
    meta_description: product?.meta_description || '',
    // Design
    template_id: product?.template_id || initialTemplateId || 'dark-pro',
    // Marketing tab
    pixel_meta: product?.pixel_meta || '',
    pixel_tiktok: product?.pixel_tiktok || '',
    pixel_gtm: product?.pixel_gtm || '',
    affiliate_url_2: product?.affiliate_url_2 || '',
    affiliate_url_3: product?.affiliate_url_3 || '',
    email_capture_enabled: product?.email_capture_enabled ?? false,
    email_capture_discount: product?.email_capture_discount?.toString() || '10',
    exit_intent_enabled: product?.exit_intent_enabled ?? true,
  });

  // Galerie d'images (06/10, demande Jerome : "3 photos ou plus" par
  // produit). Liste ordonnée : la 1re image est la couverture (copiée dans
  // image_url à l'enregistrement, pour que cartes/catalogue/Open Graph —
  // qui lisent toutes image_url — continuent de fonctionner sans changement).
  // Rétrocompatible : un produit sans `images` démarre avec son image_url.
  const [images, setImages] = useState<string[]>(
    product?.images && product.images.length > 0
      ? product.images
      : product?.image_url
        ? [product.image_url]
        : []
  );
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Upload direct (05/10, demande Jerome : sans outil tiers). Le recadrage
  // carré 1200x1200 uniforme et l'optimisation format/qualité sont gérés
  // côté Cloudinary par app/api/upload — voir ce fichier pour le détail.
  // Plusieurs fichiers d'un coup : envoyés un par un (ordre conservé).
  const MAX_IMAGES = 8;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesUpload = async (files: FileList) => {
    const room = MAX_IMAGES - images.length;
    const selected = Array.from(files).slice(0, Math.max(room, 0));
    if (selected.length === 0) {
      setUploadError(`Maximum ${MAX_IMAGES} images par produit.`);
      return;
    }
    setUploading(true);
    setUploadError(null);
    const added: string[] = [];
    try {
      for (const file of selected) {
        const body = new FormData();
        body.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body });
        if (!res.ok) throw new Error(await readApiError(res, "Erreur lors de l'envoi de l'image"));
        const data = await res.json();
        added.push(data.public_id || data.url);
      }
      if (files.length > selected.length) {
        setUploadError(`Seules les ${selected.length} premières images ont été ajoutées (maximum ${MAX_IMAGES}).`);
      }
    } catch (err) {
      setUploadError(networkErrorMessage(err));
    } finally {
      // Les images déjà envoyées avec succès sont conservées même si une
      // suivante échoue — évite de perdre un upload déjà payé en bande passante.
      if (added.length > 0) setImages((prev) => [...prev, ...added]);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addImageByUrl = () => {
    const v = imageUrlInput.trim();
    if (!v) return;
    if (images.length >= MAX_IMAGES) {
      setUploadError(`Maximum ${MAX_IMAGES} images par produit.`);
      return;
    }
    setImages((prev) => [...prev, v]);
    setImageUrlInput('');
    setUploadError(null);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, delta: -1 | 1) => {
    setImages((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleChange = (field: string, value: string | boolean) => {
    // Après un enregistrement qui est resté sur la page (marché pas prêt), toute nouvelle modification redonne accès au bouton.
    if (success && syncNotice?.blocked) setSuccess(false);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerated = (content: GeneratedContent) => {
    const hasContent = !!(form.hero_title.trim() || form.tiktok_script.trim() || form.benefits.trim().length > 2 || form.faq.trim().length > 2);
    if (hasContent && !confirm('Le contenu généré va remplacer le titre, les textes, la FAQ, le script et le SEO actuels de cette fiche (pas encore enregistrés). Continuer ?')) return;
    setForm((prev) => ({
      ...prev,
      hero_title: content.hero_title,
      hero_subtitle: content.hero_subtitle,
      pain_points: JSON.stringify(content.pain_points, null, 2),
      benefits: JSON.stringify(content.benefits, null, 2),
      faq: JSON.stringify(content.faq, null, 2),
      tiktok_script: content.tiktok_script,
      // Les « témoignages » générés par l'IA sont fictifs : ils ne sont plus repris (décision du 18/10),
      // les témoignages déjà saisis sont conservés tels quels.
      meta_title: content.meta_title,
      meta_description: content.meta_description,
    }));
    setActiveTab('ai');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Champs JSON : on indique lequel est faux et on emmène directement sur l'onglet concerné.
      const parsed: Record<string, unknown> = {};
      for (const field of ['pain_points', 'benefits', 'faq', 'testimonials'] as const) {
        try {
          parsed[field] = parseJsonList(form[field]);
        } catch {
          setActiveTab('ai');
          throw new Error(`Le champ « ${JSON_FIELD_LABELS[field]} » (onglet Contenu IA) n'est pas un JSON valide. Corrigez-le ou videz-le.`);
        }
      }
      const painPoints = parsed.pain_points;
      const benefits = parsed.benefits;
      const faq = parsed.faq;
      const testimonials = parsed.testimonials;

      if (form.video_url.trim() && !getYouTubeId(form.video_url)) {
        setActiveTab('basic');
        throw new Error('La vidéo doit être un lien YouTube (youtube.com/watch?v=…, youtu.be/…, /shorts/…).');
      }
      const num = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : null);
      for (const [label, v] of [['Prix', form.price], ['Prix original', form.original_price], ['Coût d\'achat', form.cost_price], ['Budget pub', form.ad_spend_allocated], ['Commission', form.commission_rate]] as const) {
        const n = num(v);
        if (n !== null && (!Number.isFinite(n) || n < 0)) {
          setActiveTab('basic');
          throw new Error(`« ${label} » doit être un nombre positif.`);
        }
      }

      const payload = {
        name: form.name,
        description: form.description || null,
        price: num(form.price),
        original_price: num(form.original_price),
        cost_price: num(form.cost_price),
        ad_spend_allocated: num(form.ad_spend_allocated),
        commission_rate: num(form.commission_rate) !== null ? (num(form.commission_rate) as number) / 100 : null,
        affiliate_url: form.affiliate_url,
        video_url: form.video_url.trim() || null,
        price_currency: form.price_currency || null,
        price_checked_at: form.price_checked_at || null,
        free_shipping: !!form.free_shipping,
        // images[0] = couverture, recopiée dans image_url (voir plus haut).
        image_url: images[0] || null,
        images,
        active: form.active,
        slug: form.slug || undefined,
        category_id: form.category_id || null,
        hero_title: form.hero_title || null,
        hero_subtitle: form.hero_subtitle || null,
        pain_points: painPoints,
        benefits: benefits,
        faq: faq,
        tiktok_script: form.tiktok_script || null,
        testimonials: testimonials,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        pixel_meta: form.pixel_meta || null,
        pixel_tiktok: form.pixel_tiktok || null,
        pixel_gtm: form.pixel_gtm || null,
        affiliate_url_2: form.affiliate_url_2 || null,
        affiliate_url_3: form.affiliate_url_3 || null,
        email_capture_enabled: form.email_capture_enabled,
        email_capture_discount: form.email_capture_discount ? parseInt(form.email_capture_discount) : 10,
        exit_intent_enabled: form.exit_intent_enabled,
        template_id: form.template_id || 'dark-pro',
      };

      const url = mode === 'edit' ? `/api/products/${product!.id}` : '/api/products';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await readApiError(res, 'Erreur lors de la sauvegarde'));

      // En modification, passer en ligne / en brouillon se répercute sur les autres marchés du produit :
      // ceux qui ne sont pas prêts (lien encore neutre, pas de photo) restent en brouillon, et Jerome doit le savoir.
      const saved = await res.json().catch(() => null);
      const summary = summarizeSync(saved?.sync as SyncReport | undefined, form.active);
      setSuccess(true);
      if (summary.text) setSyncNotice(summary);
      if (!summary.blocked) {
        setTimeout(() => {
          router.push('/admin/products');
          router.refresh();
        }, summary.text ? 2500 : 800);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(networkErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5';
  const textareaClass = `${inputClass} resize-y min-h-[100px]`;

  // JSON field validation
  const jsonErrors = useMemo(() => ({
    pain_points: !isValidJson(form.pain_points) ? 'JSON invalide' : null,
    benefits: !isValidJson(form.benefits) ? 'JSON invalide' : null,
    faq: !isValidJson(form.faq) ? 'JSON invalide' : null,
    testimonials: !isValidJson(form.testimonials) ? 'JSON invalide' : null,
  }), [form.pain_points, form.benefits, form.faq, form.testimonials]);

  const jsonInputClass = (field: keyof typeof jsonErrors) =>
    `${inputClass} font-mono text-xs resize-y min-h-[150px] ${jsonErrors[field] ? 'border-red-400 focus:ring-red-400' : ''}`;

  const tabs = [
    { id: 'basic', label: '📋 Informations' },
    { id: 'ai', label: '🤖 Contenu IA' },
    { id: 'seo', label: '🔍 SEO' },
    { id: 'marketing', label: '📣 Marketing' },
    { id: 'design', label: '🎨 Design' },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tab navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-0 overflow-x-auto" role="tablist" aria-label="Sections de la fiche produit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all -mb-px ${
              activeTab === tab.id
                ? 'bg-white border border-b-white border-gray-200 text-primary-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Basic Information */}
      {activeTab === 'basic' && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass} htmlFor="pf-name">Nom du produit *</label>
              <input
                type="text"
                id="pf-name" value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={inputClass}
                placeholder="Ex: Ceinture massante SmartFit Pro"
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-slug">Slug URL</label>
              <input
                type="text"
                id="pf-slug" value={form.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                className={inputClass}
                placeholder="Auto-généré depuis le nom"
              />
              <p className="text-xs text-gray-400 mt-1">Laissez vide pour auto-générer</p>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-category">Catégorie</label>
            <select
              id="pf-category"
              value={form.category_id}
              onChange={(e) => handleChange('category_id', e.target.value)}
              className={inputClass}
            >
              <option value="">— Aucune catégorie —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon ? `${cat.icon} ` : ''}{categoryName(cat, market)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-description">Description</label>
            <textarea
              id="pf-description" value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className={textareaClass}
              placeholder="Description complète du produit..."
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass} htmlFor="pf-price">Prix (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                id="pf-price" value={form.price}
                onChange={(e) => handleChange('price', e.target.value)}
                className={inputClass}
                placeholder="29.99"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-original_price">Prix original (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                id="pf-original_price" value={form.original_price}
                onChange={(e) => handleChange('original_price', e.target.value)}
                className={inputClass}
                placeholder="59.99"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            <div>
              <label className={labelClass} htmlFor="pf-price_currency">Devise du prix</label>
              <select
                id="pf-price_currency" value={form.price_currency}
                onChange={(e) => handleChange('price_currency', e.target.value)}
                className={inputClass}
              >
                <option value="">Par défaut du marché</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-price_checked_at">Date du relevé du prix</label>
              <input
                type="date"
                id="pf-price_checked_at" value={form.price_checked_at}
                onChange={(e) => handleChange('price_checked_at', e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-gray-500 mt-1">Sans date, le prix reste masqué sur le site.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mt-7">
              <input
                type="checkbox"
                checked={!!form.free_shipping}
                onChange={(e) => handleChange('free_shipping', e.target.checked)}
              />
              <span>
                Livraison gratuite
                <span className="block text-xs font-normal text-gray-400">Pour le marché {market.toUpperCase()} uniquement</span>
              </span>
            </label>
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-video_url">Vidéo (lien YouTube)</label>
            <input
              type="url"
              id="pf-video_url" value={form.video_url}
              onChange={(e) => handleChange('video_url', e.target.value)}
              className={inputClass}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            {form.video_url.trim() ? (
              getYouTubeId(form.video_url) ? (
                <p className="text-xs text-green-700 mt-1">Vidéo YouTube reconnue ✓</p>
              ) : (
                <p className="text-xs text-red-600 mt-1">Ce lien n&apos;est pas une vidéo YouTube : il ne sera pas accepté à l&apos;enregistrement.</p>
              )
            ) : (
              <p className="text-xs text-gray-400 mt-1">Vidéo du fabricant ou d&apos;un test. Affichée en miniature sur la fiche ; seul YouTube est accepté.</p>
            )}
          </div>

          {/* Coût vs Gain (Sprint 5) */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Coût vs Gain <span className="normal-case font-normal text-gray-400">— alimente le calcul ROI du dashboard/Analytics</span>
            </p>
            <div className="grid sm:grid-cols-3 gap-5">
              <div>
                <label className={labelClass} htmlFor="pf-cost_price">Coût d&apos;achat</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="pf-cost_price" value={form.cost_price}
                  onChange={(e) => handleChange('cost_price', e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-400 mt-1">Prix de revient par vente (surtout pour un produit vendu en propre)</p>
              </div>
              <div>
                <label className={labelClass} htmlFor="pf-ad_spend_allocated">Budget pub alloué</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="pf-ad_spend_allocated" value={form.ad_spend_allocated}
                  onChange={(e) => handleChange('ad_spend_allocated', e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-400 mt-1">Dépense pub totale imputée à ce produit</p>
              </div>
              <div>
                <label className={labelClass} htmlFor="pf-commission_rate">Commission (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  id="pf-commission_rate" value={form.commission_rate}
                  onChange={(e) => handleChange('commission_rate', e.target.value)}
                  className={inputClass}
                  placeholder="30"
                />
                <p className="text-xs text-gray-400 mt-1">Taux réel si connu (AWIN/Rakuten/CJ...), sinon 30% par défaut</p>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-affiliate_url">URL d&apos;affiliation *</label>
            <input
              type="url"
              id="pf-affiliate_url" value={form.affiliate_url}
              onChange={(e) => handleChange('affiliate_url', e.target.value)}
              className={inputClass}
              placeholder="https://amazon.fr/dp/..."
              required
            />
          </div>

          <div>
            <label className={labelClass}>
              Photos du produit ({images.length}/{MAX_IMAGES})
            </label>

            {images.length > 0 && (
              <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                {images.map((img, i) => (
                  <li key={`${img}-${i}`} className="border border-gray-200 rounded-xl p-2 bg-white">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getCloudinaryUrl(img, { width: 240, height: 240, crop: 'fill', format: 'auto', quality: 'auto' })}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {i === 0 && (
                        <span className="absolute left-1.5 top-1.5 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Couverture
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(i, -1)}
                        disabled={i === 0}
                        aria-label="Déplacer vers la gauche"
                        className="px-2 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="px-2 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Retirer
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(i, 1)}
                        disabled={i === images.length - 1}
                        aria-label="Déplacer vers la droite"
                        className="px-2 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        →
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading || images.length >= MAX_IMAGES}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) handleFilesUpload(e.target.files);
                  }}
                  className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 file:cursor-pointer disabled:opacity-60"
                />
                {uploading && <span className="text-xs text-gray-400">Envoi en cours...</span>}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addImageByUrl();
                    }
                  }}
                  className={inputClass}
                  placeholder="Ou colle une URL / un Cloudinary public ID, puis Ajouter"
                />
                <button
                  type="button"
                  onClick={addImageByUrl}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                >
                  Ajouter
                </button>
              </div>
              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              <p className="text-xs text-gray-400">
                Sélectionne plusieurs fichiers d&apos;un coup. Chaque image est recadrée en carré
                automatiquement et son format/poids est optimisé à l&apos;affichage. La première
                photo est la couverture (cartes, catalogue, partage) — utilise les flèches pour
                changer l&apos;ordre.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.active}
              aria-label="Page active (publiée)"
              onClick={() => handleChange('active', !form.active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                form.active ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  form.active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Page active {form.active ? '(publiée)' : '(cachée)'}
              <span className="block text-xs font-normal text-gray-400">
                Mettre en ligne ou en brouillon se répercute sur les autres marchés du même produit (si leur lien affilié et leur photo sont prêts).
              </span>
            </span>
          </div>

          {/* Generate button */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3">
              Générez automatiquement tout le contenu marketing avec l&apos;IA :
            </p>
            <GenerateButton
              name={form.name}
              description={form.description}
              price={form.price && Number.isFinite(Number(form.price.replace(',', '.'))) ? Number(form.price.replace(',', '.')) : null}
              market={market}
              onGenerated={handleGenerated}
              disabled={!form.name || !form.description}
            />
          </div>
        </div>
      )}

      {/* Tab: AI Content */}
      {activeTab === 'ai' && (
        <div className="space-y-5">
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div className="text-sm text-primary-700">
              <strong>Contenu généré par IA.</strong> Vous pouvez modifier chaque champ directement.
              Les champs JSONB acceptent des tableaux JSON valides.
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-hero_title">Titre Hero</label>
            <input
              type="text"
              id="pf-hero_title" value={form.hero_title}
              onChange={(e) => handleChange('hero_title', e.target.value)}
              className={inputClass}
              placeholder="Titre principal de la page..."
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-hero_subtitle">Sous-titre Hero</label>
            <textarea
              id="pf-hero_subtitle" value={form.hero_subtitle}
              onChange={(e) => handleChange('hero_subtitle', e.target.value)}
              className={`${inputClass} resize-y min-h-[80px]`}
              placeholder="Description courte du produit..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass.replace('mb-1.5', '')} htmlFor="pf-pain_points">Points de douleur (JSON)</label>
              {jsonErrors.pain_points && <span className="text-xs text-red-500 font-medium">{jsonErrors.pain_points}</span>}
            </div>
            <textarea
              id="pf-pain_points"
              value={form.pain_points}
              onChange={(e) => handleChange('pain_points', e.target.value)}
              className={jsonInputClass('pain_points')}
              placeholder='[{"emoji":"😩","title":"...","description":"..."}]'
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass.replace('mb-1.5', '')} htmlFor="pf-benefits">Bénéfices (JSON)</label>
              {jsonErrors.benefits && <span className="text-xs text-red-500 font-medium">{jsonErrors.benefits}</span>}
            </div>
            <textarea
              id="pf-benefits"
              value={form.benefits}
              onChange={(e) => handleChange('benefits', e.target.value)}
              className={jsonInputClass('benefits')}
              placeholder='[{"icon":"✅","title":"...","description":"..."}]'
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass.replace('mb-1.5', '')} htmlFor="pf-faq">FAQ (JSON)</label>
              {jsonErrors.faq && <span className="text-xs text-red-500 font-medium">{jsonErrors.faq}</span>}
            </div>
            <textarea
              id="pf-faq"
              value={form.faq}
              onChange={(e) => handleChange('faq', e.target.value)}
              className={jsonInputClass('faq')}
              placeholder='[{"question":"...","answer":"..."}]'
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass.replace('mb-1.5', '')} htmlFor="pf-testimonials">Témoignages (JSON) <span className="font-normal text-gray-400">— non affichés sur le site</span></label>
              {jsonErrors.testimonials && <span className="text-xs text-red-500 font-medium">{jsonErrors.testimonials}</span>}
            </div>
            <textarea
              id="pf-testimonials"
              value={form.testimonials}
              onChange={(e) => handleChange('testimonials', e.target.value)}
              className={jsonInputClass('testimonials')}
              placeholder='[{"name":"...","location":"...","rating":5,"text":"...","date":"..."}]'
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-tiktok_script">Script TikTok</label>
            <textarea
              id="pf-tiktok_script" value={form.tiktok_script}
              onChange={(e) => handleChange('tiktok_script', e.target.value)}
              className={textareaClass}
              placeholder="Script pour vidéo TikTok/Reels..."
            />
          </div>

          {/* Regenerate */}
          <div className="pt-4 border-t border-gray-200">
            <GenerateButton
              name={form.name}
              description={form.description}
              price={form.price && Number.isFinite(Number(form.price.replace(',', '.'))) ? Number(form.price.replace(',', '.')) : null}
              market={market}
              onGenerated={handleGenerated}
              disabled={!form.name || !form.description}
            />
          </div>
        </div>
      )}

      {/* Tab: SEO */}
      {activeTab === 'seo' && (
        <div className="space-y-5">
          <div>
            <label className={labelClass} htmlFor="pf-meta_title">Titre SEO (meta title)</label>
            <input
              type="text"
              id="pf-meta_title" value={form.meta_title}
              onChange={(e) => handleChange('meta_title', e.target.value)}
              className={inputClass}
              placeholder="Titre pour les moteurs de recherche (max 60 car.)"
              maxLength={60}
            />
            <p className="text-xs text-gray-400 mt-1">{form.meta_title.length}/60 caractères</p>
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-meta_description">Description SEO (meta description)</label>
            <textarea
              id="pf-meta_description" value={form.meta_description}
              onChange={(e) => handleChange('meta_description', e.target.value)}
              className={`${inputClass} resize-y min-h-[100px]`}
              placeholder="Description pour Google (max 155 car.)"
              maxLength={155}
            />
            <p className="text-xs text-gray-400 mt-1">{form.meta_description.length}/155 caractères</p>
          </div>

          {/* Preview */}
          {(form.meta_title || form.meta_description) && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Aperçu Google</p>
              <div className="text-blue-600 text-lg font-medium hover:underline cursor-pointer">
                {form.meta_title || form.name || 'Titre de la page'}
              </div>
              <div className="text-green-700 text-sm">
                {publicUrl(market, '/').replace(/\/$/, '')}/{form.slug || 'slug'}
              </div>
              <div className="text-gray-600 text-sm mt-1 line-clamp-2">
                {form.meta_description || form.description || 'Description de la page...'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Marketing */}
      {activeTab === 'marketing' && (
        <div className="space-y-8">
          {/* Pixels */}
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-4">Pixels de suivi</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="pf-pixel_meta">Meta Pixel ID</label>
                <input
                  type="text"
                  id="pf-pixel_meta" value={form.pixel_meta}
                  onChange={(e) => handleChange('pixel_meta', e.target.value)}
                  className={inputClass}
                  placeholder="Ex: 123456789012345"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="pf-pixel_tiktok">TikTok Pixel ID</label>
                <input
                  type="text"
                  id="pf-pixel_tiktok" value={form.pixel_tiktok}
                  onChange={(e) => handleChange('pixel_tiktok', e.target.value)}
                  className={inputClass}
                  placeholder="Ex: C9ABC123DEF456"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="pf-pixel_gtm">Google Tag Manager ID</label>
                <input
                  type="text"
                  id="pf-pixel_gtm" value={form.pixel_gtm}
                  onChange={(e) => handleChange('pixel_gtm', e.target.value)}
                  className={inputClass}
                  placeholder="Ex: GTM-XXXXXXX"
                />
              </div>
            </div>
          </div>

          {/* Multi-affiliation */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-4">Multi-affiliation</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="pf-affiliate_url_2">URL Affiliée 2</label>
                <input
                  type="url"
                  id="pf-affiliate_url_2" value={form.affiliate_url_2}
                  onChange={(e) => handleChange('affiliate_url_2', e.target.value)}
                  className={inputClass}
                  placeholder="Ex: lien Amazon"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="pf-affiliate_url_3">URL Affiliée 3</label>
                <input
                  type="url"
                  id="pf-affiliate_url_3" value={form.affiliate_url_3}
                  onChange={(e) => handleChange('affiliate_url_3', e.target.value)}
                  className={inputClass}
                  placeholder="Ex: lien Awin"
                />
              </div>
            </div>
          </div>

          {/* Engagement */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-4">Engagement</h3>
            <div className="space-y-4">
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={form.exit_intent_enabled}
                  onChange={(e) => handleChange('exit_intent_enabled', e.target.checked)}
                />
                <span>
                  <span className="font-semibold">Fenêtre « avant de partir »</span>
                  <span className="block text-xs text-gray-400">S&apos;affiche quand le visiteur s&apos;apprête à quitter la page.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={form.email_capture_enabled}
                  onChange={(e) => handleChange('email_capture_enabled', e.target.checked)}
                />
                <span>
                  <span className="font-semibold">Collecte d&apos;adresses e-mail</span>
                  <span className="block text-xs text-gray-400">Propose une remise en échange de l&apos;adresse e-mail du visiteur.</span>
                </span>
              </label>
              {form.email_capture_enabled && (
                <div className="max-w-xs">
                  <label className={labelClass} htmlFor="pf-email_capture_discount">Remise proposée (%)</label>
                  <input
                    id="pf-email_capture_discount"
                    type="number"
                    min="0"
                    max="100"
                    value={form.email_capture_discount}
                    onChange={(e) => handleChange('email_capture_discount', e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Design */}
      {activeTab === 'design' && (
        <div className="space-y-4">
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-2xl">🎨</span>
            <div className="text-sm text-primary-700">
              <strong>Template de la page de vente.</strong> Choisissez le design qui correspond le mieux à votre produit.
              Vous pourrez le personnaliser dans le <a href="/admin/design" className="underline">Design Studio</a>.
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleChange('template_id', tpl.id)}
                className={`relative rounded-xl border-2 p-3 text-left transition-all hover:shadow-md ${
                  form.template_id === tpl.id
                    ? 'border-primary-500 bg-primary-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {form.template_id === tpl.id && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                {/* Color preview */}
                <div
                  className="w-full h-12 rounded-lg mb-2"
                  style={{ background: `linear-gradient(135deg, ${tpl.primaryColor}, ${tpl.accentColor})` }}
                />
                <div className="text-base leading-none mb-1">{tpl.emoji}</div>
                <div className="font-semibold text-gray-900 text-xs">{tpl.name}</div>
                <div className="text-gray-400 text-xs mt-0.5 capitalize">{tpl.style}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p role="alert" className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-green-700 text-sm font-medium">Produit sauvegardé avec succès !</p>
        </div>
      )}

      {syncNotice && (
        <div
          role="status"
          className={`rounded-xl p-4 text-sm border ${syncNotice.blocked ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}
        >
          <p>{syncNotice.text}</p>
          {syncNotice.blocked && (
            <p className="mt-2">
              Les marchés restés en brouillon seront mis en ligne dès que leur lien d&apos;affiliation et leur photo seront prêts.{' '}
              <button type="button" onClick={() => { router.push('/admin/products'); router.refresh(); }} className="font-semibold underline">
                Retour aux produits
              </button>
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving || success}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sauvegarde...
            </>
          ) : success ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Sauvegardé !
            </>
          ) : (
            mode === 'create' ? 'Créer le produit' : 'Sauvegarder les modifications'
          )}
        </button>

        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200"
        >
          Annuler
        </button>

        {mode === 'edit' && product?.slug && (
          <a
            href={publicUrl(market, `/${product.slug}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Voir la page
          </a>
        )}
      </div>
    </form>
  );
}
