'use client';

import React, { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { Product } from '@/types';
import { TEMPLATES, getTemplate } from '@/lib/templates';
import TemplateRenderer, { type TemplateOverrides } from '@/components/templates/TemplateRenderer';
import TemplateThumbnail from './TemplateThumbnail';
import EditorPanel from './EditorPanel';

// ─── Colour map (bg gradient class → hex) ───────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  'from-gray-950': '#030712', 'to-violet-950': '#2e1065',
  'from-white': '#ffffff',    'to-gray-50': '#f9fafb',
  'from-red-950': '#450a0a',  'to-orange-900': '#431407',
  'from-emerald-950': '#022c22', 'to-green-900': '#14532d',
  'from-blue-950': '#172554', 'to-cyan-900': '#164e63',
  'from-stone-950': '#0c0a09', 'to-amber-950': '#451a03',
  'from-purple-50': '#faf5ff', 'to-pink-50': '#fdf2f8',
  'from-amber-400': '#fbbf24', 'to-orange-500': '#f97316',
  'to-blue-50': '#eff6ff',    'to-slate-900': '#0f172a',
};

// ─── Carousel shown when no product is selected ──────────────────────────────
function TemplateCarousel({
  selectedTemplateId,
  onSelect,
}: {
  selectedTemplateId: string;
  onSelect: (id: string) => void;
}) {
  const [current, setCurrent] = useState(0);
  const total = TEMPLATES.length;

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  // Show 3 cards centred: index-1, index, index+1
  const visible = [-1, 0, 1].map((offset) => {
    const idx = (current + offset + total) % total;
    return { template: TEMPLATES[idx], offset };
  });

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-950 via-violet-950 to-gray-900 select-none">
      {/* Title */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Choisissez votre template</h2>
        <p className="text-violet-300 text-sm mt-1">10 designs disponibles — ajoutez un produit pour prévisualiser en conditions réelles</p>
      </div>

      {/* Carousel track */}
      <div className="relative flex items-center justify-center w-full" style={{ height: 420 }}>
        {/* Left arrow */}
        <button
          onClick={prev}
          className="absolute left-6 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition-all"
        >
          ‹
        </button>

        {/* Cards */}
        <div className="relative flex items-center justify-center" style={{ width: '100%' }}>
          {visible.map(({ template, offset }) => {
            const from = COLOR_MAP[template.bgFrom] || '#111827';
            const to   = COLOR_MAP[template.bgTo]   || '#1f2937';
            const isCenter = offset === 0;
            const isSelected = template.id === selectedTemplateId;

            return (
              <div
                key={template.id}
                onClick={() => {
                  if (isCenter) {
                    onSelect(template.id);
                  } else {
                    setCurrent((current + offset + total) % total);
                  }
                }}
                style={{
                  position: 'absolute',
                  width: isCenter ? 280 : 210,
                  height: isCenter ? 390 : 290,
                  left: '50%',
                  transform: `translateX(calc(-50% + ${offset * 260}px)) scale(${isCenter ? 1 : 0.88})`,
                  transition: 'all 0.35s cubic-bezier(.4,0,.2,1)',
                  zIndex: isCenter ? 10 : 5,
                  opacity: isCenter ? 1 : 0.6,
                  cursor: 'pointer',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: isSelected
                    ? '0 0 0 3px #7C3AED, 0 20px 60px rgba(124,58,237,0.4)'
                    : isCenter
                    ? '0 20px 60px rgba(0,0,0,0.5)'
                    : '0 8px 24px rgba(0,0,0,0.3)',
                  flexShrink: 0,
                }}
              >
                {/* Gradient background */}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '24px 20px 20px',
                  }}
                >
                  {/* Mock UI lines */}
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                      <span style={{ fontSize: isCenter ? 36 : 28 }}>{template.emoji}</span>
                    </div>
                    <div style={{
                      height: isCenter ? 10 : 8,
                      borderRadius: 6,
                      background: template.textColor === 'white' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
                      marginBottom: 8,
                      width: '80%',
                      margin: '0 auto 8px',
                    }} />
                    <div style={{
                      height: isCenter ? 6 : 5,
                      borderRadius: 4,
                      background: template.textColor === 'white' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
                      width: '60%',
                      margin: '0 auto 16px',
                    }} />
                    {/* Fake CTA button */}
                    <div style={{
                      height: isCenter ? 34 : 26,
                      borderRadius: 8,
                      background: template.primaryColor,
                      width: '70%',
                      margin: '0 auto 16px',
                    }} />
                    {/* Fake content lines */}
                    {[85, 70, 75, 60].map((w, i) => (
                      <div key={i} style={{
                        height: isCenter ? 5 : 4,
                        borderRadius: 3,
                        background: template.textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
                        width: `${w}%`,
                        margin: '0 auto',
                        marginBottom: isCenter ? 7 : 5,
                      }} />
                    ))}
                  </div>

                  {/* Bottom: name + button */}
                  {isCenter && (
                    <div style={{ width: '100%', marginTop: 12 }}>
                      <div style={{
                        textAlign: 'center',
                        color: template.textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
                        fontWeight: 700,
                        fontSize: 13,
                        marginBottom: 10,
                        letterSpacing: '0.03em',
                      }}>
                        {template.name}
                      </div>
                      <Link
                        href="/admin/products/new"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'block',
                          textAlign: 'center',
                          background: '#7C3AED',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 12,
                          padding: '9px 16px',
                          borderRadius: 8,
                          textDecoration: 'none',
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                      >
                        + Ajouter un produit
                      </Link>
                    </div>
                  )}
                </div>

                {/* Selected badge */}
                {isSelected && isCenter && (
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: '#7C3AED',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 20,
                  }}>
                    ✓ Sélectionné
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right arrow */}
        <button
          onClick={next}
          className="absolute right-6 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition-all"
        >
          ›
        </button>
      </div>

      {/* Dots */}
      <div className="flex gap-2 mt-6">
        {TEMPLATES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: i === current ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === current ? '#7C3AED' : 'rgba(255,255,255,0.25)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.25s',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Template name below dots */}
      <p className="mt-3 text-violet-200 text-xs font-semibold tracking-wide uppercase">
        {TEMPLATES[current].emoji} {TEMPLATES[current].name}
      </p>
    </div>
  );
}

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
            <TemplateCarousel
              selectedTemplateId={selectedTemplateId}
              onSelect={handleTemplateChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
