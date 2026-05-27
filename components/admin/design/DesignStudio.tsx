'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { Product } from '@/types';
import { TEMPLATES, getTemplate } from '@/lib/templates';
import TemplateRenderer, { type TemplateOverrides } from '@/components/templates/TemplateRenderer';
import TemplateThumbnail from './TemplateThumbnail';
import EditorPanel from './EditorPanel';

interface Props {
  products: Product[];
  initialProductId?: string;
}

type DeviceMode = 'desktop' | 'mobile';

function buildDefaultOverrides(product: Product | undefined, templateId: string): TemplateOverrides {
  const template = getTemplate(templateId);
  return {
    heroTitle: product?.hero_title || '',
    heroSubtitle: product?.hero_subtitle || '',
    ctaText: 'Acheter maintenant',
    sections: {
      painPoints: true,
      benefits: true,
      testimonials: true,
      faq: true,
      countdown: template.defaultSections.countdown,
      stock: template.defaultSections.stock,
    },
  };
}

export default function DesignStudio({ products, initialProductId }: Props) {
  const firstProductId = initialProductId || products[0]?.id || '';

  const [selectedProductId, setSelectedProductId] = useState<string>(firstProductId);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('dark-pro');
  const [overrides, setOverrides] = useState<TemplateOverrides>(() => {
    const product = products.find((p) => p.id === firstProductId);
    return buildDefaultOverrides(product, 'dark-pro');
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedTemplate = getTemplate(selectedTemplateId);

  // Reset overrides when product or template changes
  const handleProductChange = useCallback(
    (productId: string) => {
      setSelectedProductId(productId);
      const product = products.find((p) => p.id === productId);
      setOverrides(buildDefaultOverrides(product, selectedTemplateId));
    },
    [products, selectedTemplateId]
  );

  const handleTemplateChange = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      const product = products.find((p) => p.id === selectedProductId);
      setOverrides(buildDefaultOverrides(product, templateId));
    },
    [products, selectedProductId]
  );

  const handleOverrideChange = useCallback(
    async (newOverrides: TemplateOverrides & { save?: boolean }) => {
      const { save, ...rest } = newOverrides;
      setOverrides(rest);

      if (save && selectedProductId) {
        setIsSaving(true);
        setSavedMessage('');
        try {
          const res = await fetch(`/api/design/${selectedProductId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              template_id: selectedTemplateId,
              template_config: rest,
            }),
          });
          if (res.ok) {
            setSavedMessage('Design appliqué avec succès !');
          } else {
            setSavedMessage('Erreur lors de la sauvegarde');
          }
        } catch {
          setSavedMessage('Erreur lors de la sauvegarde');
        } finally {
          setIsSaving(false);
          setTimeout(() => setSavedMessage(''), 3000);
        }
      }
    },
    [selectedProductId, selectedTemplateId]
  );

  const handleSave = async () => {
    if (!selectedProductId) return;
    setIsSaving(true);
    setSavedMessage('');
    try {
      const res = await fetch(`/api/design/${selectedProductId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplateId,
          template_config: overrides,
        }),
      });
      if (res.ok) {
        setSavedMessage('Design sauvegardé !');
      } else {
        setSavedMessage('Erreur lors de la sauvegarde');
      }
    } catch {
      setSavedMessage('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Header bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <h1 className="text-base font-bold text-gray-900">Design Studio</h1>
        </div>

        {/* Product selector */}
        <select
          value={selectedProductId}
          onChange={(e) => handleProductChange(e.target.value)}
          className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white text-gray-700"
        >
          {products.length === 0 && (
            <option value="">Aucun produit disponible</option>
          )}
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Device switcher */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              deviceMode === 'desktop'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🖥 Desktop
          </button>
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              deviceMode === 'mobile'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📱 Mobile
          </button>
        </div>

        {/* Status message */}
        {savedMessage && (
          <span
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
              savedMessage.includes('Erreur')
                ? 'bg-red-50 text-red-600'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {savedMessage}
          </span>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={isSaving || !selectedProductId}
          className="ml-auto px-4 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {/* Template thumbnails strip */}
      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {TEMPLATES.map((template) => (
            <TemplateThumbnail
              key={template.id}
              template={template}
              isSelected={selectedTemplateId === template.id}
              onClick={() => handleTemplateChange(template.id)}
              product={selectedProduct}
            />
          ))}
        </div>
      </div>

      {/* Main area: editor + preview */}
      <div className="flex flex-1 min-h-0">
        {/* Editor panel */}
        <EditorPanel
          overrides={overrides}
          onChange={handleOverrideChange}
          template={selectedTemplate}
          productSlug={selectedProduct?.slug}
        />

        {/* Live preview */}
        <div className="flex-1 overflow-auto bg-gray-100">
          {selectedProduct ? (
            <div className={deviceMode === 'mobile' ? 'max-w-sm mx-auto' : ''}>
              <TemplateRenderer
                product={selectedProduct}
                template={selectedTemplate}
                overrides={overrides}
                scale={1}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-5xl mb-4">🎨</div>
                <h3 className="text-lg font-bold text-gray-600 mb-2">Sélectionnez un produit</h3>
                <p className="text-gray-400 text-sm">
                  Choisissez un produit dans le menu déroulant pour prévisualiser le design
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
