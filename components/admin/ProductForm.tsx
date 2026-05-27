'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GenerateButton from './GenerateButton';
import type { Product, GeneratedContent } from '@/types';

interface ProductFormProps {
  product?: Product;
  mode: 'create' | 'edit';
}

export default function ProductForm({ product, mode }: ProductFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'ai' | 'seo' | 'marketing'>('basic');

  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    original_price: product?.original_price?.toString() || '',
    affiliate_url: product?.affiliate_url || '',
    image_url: product?.image_url || '',
    active: product?.active ?? true,
    slug: product?.slug || '',
    hero_title: product?.hero_title || '',
    hero_subtitle: product?.hero_subtitle || '',
    pain_points: product?.pain_points ? JSON.stringify(product.pain_points, null, 2) : '[]',
    benefits: product?.benefits ? JSON.stringify(product.benefits, null, 2) : '[]',
    faq: product?.faq ? JSON.stringify(product.faq, null, 2) : '[]',
    tiktok_script: product?.tiktok_script || '',
    testimonials: product?.testimonials ? JSON.stringify(product.testimonials, null, 2) : '[]',
    meta_title: product?.meta_title || '',
    meta_description: product?.meta_description || '',
    // Marketing tab
    pixel_meta: product?.pixel_meta || '',
    pixel_tiktok: product?.pixel_tiktok || '',
    pixel_gtm: product?.pixel_gtm || '',
    affiliate_url_2: product?.affiliate_url_2 || '',
    affiliate_url_3: product?.affiliate_url_3 || '',
    email_capture_enabled: product?.email_capture_enabled ?? false,
    email_capture_discount: product?.email_capture_discount?.toString() || '10',
    exit_intent_enabled: product?.exit_intent_enabled ?? true,
    social_proof_enabled: product?.social_proof_enabled ?? true,
  });

  const handleToggle = (field: string) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field as keyof typeof prev] }));
  };

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerated = (content: GeneratedContent) => {
    setForm((prev) => ({
      ...prev,
      hero_title: content.hero_title,
      hero_subtitle: content.hero_subtitle,
      pain_points: JSON.stringify(content.pain_points, null, 2),
      benefits: JSON.stringify(content.benefits, null, 2),
      faq: JSON.stringify(content.faq, null, 2),
      tiktok_script: content.tiktok_script,
      testimonials: JSON.stringify(content.testimonials, null, 2),
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
      // Parse JSON fields
      let painPoints, benefits, faq, testimonials;
      try {
        painPoints = JSON.parse(form.pain_points);
        benefits = JSON.parse(form.benefits);
        faq = JSON.parse(form.faq);
        testimonials = JSON.parse(form.testimonials);
      } catch {
        throw new Error('Format JSON invalide dans les champs IA. Vérifiez la syntaxe.');
      }

      const payload = {
        name: form.name,
        description: form.description || null,
        price: form.price ? parseFloat(form.price) : null,
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        affiliate_url: form.affiliate_url,
        image_url: form.image_url || null,
        active: form.active,
        slug: form.slug || undefined,
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
        social_proof_enabled: form.social_proof_enabled,
      };

      const url = mode === 'edit' ? `/api/products/${product!.id}` : '/api/products';
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
        router.push('/admin/products');
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
  const textareaClass = `${inputClass} resize-y min-h-[100px]`;

  const tabs = [
    { id: 'basic', label: '📋 Informations' },
    { id: 'ai', label: '🤖 Contenu IA' },
    { id: 'seo', label: '🔍 SEO' },
    { id: 'marketing', label: '📣 Marketing' },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tab navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
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
              <label className={labelClass}>Nom du produit *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={inputClass}
                placeholder="Ex: Ceinture massante SmartFit Pro"
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
                placeholder="Auto-généré depuis le nom"
              />
              <p className="text-xs text-gray-400 mt-1">Laissez vide pour auto-générer</p>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className={textareaClass}
              placeholder="Description complète du produit..."
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Prix (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => handleChange('price', e.target.value)}
                className={inputClass}
                placeholder="29.99"
              />
            </div>
            <div>
              <label className={labelClass}>Prix original (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.original_price}
                onChange={(e) => handleChange('original_price', e.target.value)}
                className={inputClass}
                placeholder="59.99"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>URL d&apos;affiliation *</label>
            <input
              type="url"
              value={form.affiliate_url}
              onChange={(e) => handleChange('affiliate_url', e.target.value)}
              className={inputClass}
              placeholder="https://amazon.fr/dp/..."
              required
            />
          </div>

          <div>
            <label className={labelClass}>URL de l&apos;image</label>
            <input
              type="text"
              value={form.image_url}
              onChange={(e) => handleChange('image_url', e.target.value)}
              className={inputClass}
              placeholder="https://res.cloudinary.com/... ou URL directe"
            />
            <p className="text-xs text-gray-400 mt-1">Cloudinary public ID ou URL complète</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
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
            <label className="text-sm font-medium text-gray-700">
              Page active {form.active ? '(publiée)' : '(cachée)'}
            </label>
          </div>

          {/* Generate button */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3">
              Générez automatiquement tout le contenu marketing avec l&apos;IA :
            </p>
            <GenerateButton
              name={form.name}
              description={form.description}
              price={form.price ? parseFloat(form.price) : null}
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
            <label className={labelClass}>Titre Hero</label>
            <input
              type="text"
              value={form.hero_title}
              onChange={(e) => handleChange('hero_title', e.target.value)}
              className={inputClass}
              placeholder="Titre principal de la page..."
            />
          </div>

          <div>
            <label className={labelClass}>Sous-titre Hero</label>
            <textarea
              value={form.hero_subtitle}
              onChange={(e) => handleChange('hero_subtitle', e.target.value)}
              className={`${inputClass} resize-y min-h-[80px]`}
              placeholder="Description courte du produit..."
            />
          </div>

          <div>
            <label className={labelClass}>Points de douleur (JSON)</label>
            <textarea
              value={form.pain_points}
              onChange={(e) => handleChange('pain_points', e.target.value)}
              className={`${inputClass} font-mono text-xs resize-y min-h-[150px]`}
              placeholder='[{"emoji":"😩","title":"...","description":"..."}]'
            />
          </div>

          <div>
            <label className={labelClass}>Bénéfices (JSON)</label>
            <textarea
              value={form.benefits}
              onChange={(e) => handleChange('benefits', e.target.value)}
              className={`${inputClass} font-mono text-xs resize-y min-h-[150px]`}
              placeholder='[{"icon":"✅","title":"...","description":"..."}]'
            />
          </div>

          <div>
            <label className={labelClass}>FAQ (JSON)</label>
            <textarea
              value={form.faq}
              onChange={(e) => handleChange('faq', e.target.value)}
              className={`${inputClass} font-mono text-xs resize-y min-h-[150px]`}
              placeholder='[{"question":"...","answer":"..."}]'
            />
          </div>

          <div>
            <label className={labelClass}>Témoignages (JSON)</label>
            <textarea
              value={form.testimonials}
              onChange={(e) => handleChange('testimonials', e.target.value)}
              className={`${inputClass} font-mono text-xs resize-y min-h-[150px]`}
              placeholder='[{"name":"...","location":"...","rating":5,"text":"...","date":"..."}]'
            />
          </div>

          <div>
            <label className={labelClass}>Script TikTok</label>
            <textarea
              value={form.tiktok_script}
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
              price={form.price ? parseFloat(form.price) : null}
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
            <label className={labelClass}>Titre SEO (meta title)</label>
            <input
              type="text"
              value={form.meta_title}
              onChange={(e) => handleChange('meta_title', e.target.value)}
              className={inputClass}
              placeholder="Titre pour les moteurs de recherche (max 60 car.)"
              maxLength={60}
            />
            <p className="text-xs text-gray-400 mt-1">{form.meta_title.length}/60 caractères</p>
          </div>

          <div>
            <label className={labelClass}>Description SEO (meta description)</label>
            <textarea
              value={form.meta_description}
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
                {process.env.NEXT_PUBLIC_SITE_URL || 'https://votre-site.com'}/{form.slug || 'slug'}
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
                <label className={labelClass}>Meta Pixel ID</label>
                <input
                  type="text"
                  value={form.pixel_meta}
                  onChange={(e) => handleChange('pixel_meta', e.target.value)}
                  className={inputClass}
                  placeholder="Ex: 123456789012345"
                />
              </div>
              <div>
                <label className={labelClass}>TikTok Pixel ID</label>
                <input
                  type="text"
                  value={form.pixel_tiktok}
                  onChange={(e) => handleChange('pixel_tiktok', e.target.value)}
                  className={inputClass}
                  placeholder="Ex: C9ABC123DEF456"
                />
              </div>
              <div>
                <label className={labelClass}>Google Tag Manager ID</label>
                <input
                  type="text"
                  value={form.pixel_gtm}
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
                <label className={labelClass}>URL Affiliée 2</label>
                <input
                  type="url"
                  value={form.affiliate_url_2}
                  onChange={(e) => handleChange('affiliate_url_2', e.target.value)}
                  className={inputClass}
                  placeholder="Ex: lien Amazon"
                />
              </div>
              <div>
                <label className={labelClass}>URL Affiliée 3</label>
                <input
                  type="url"
                  value={form.affiliate_url_3}
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
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleToggle('email_capture_enabled')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    form.email_capture_enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      form.email_capture_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <label className="text-sm font-medium text-gray-700">Activer la capture d&apos;email</label>
              </div>

              {form.email_capture_enabled && (
                <div className="ml-14">
                  <label className={labelClass}>Remise proposée (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.email_capture_discount}
                    onChange={(e) => handleChange('email_capture_discount', e.target.value)}
                    className={`${inputClass} max-w-[150px]`}
                  />
                </div>
              )}

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleToggle('exit_intent_enabled')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    form.exit_intent_enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      form.exit_intent_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <label className="text-sm font-medium text-gray-700">Activer le popup de sortie</label>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleToggle('social_proof_enabled')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    form.social_proof_enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      form.social_proof_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <label className="text-sm font-medium text-gray-700">Afficher les notifications sociales</label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-700 text-sm">{error}</p>
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
          onClick={() => router.back()}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200"
        >
          Annuler
        </button>

        {mode === 'edit' && product?.slug && (
          <a
            href={`/${product.slug}`}
            target="_blank"
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
