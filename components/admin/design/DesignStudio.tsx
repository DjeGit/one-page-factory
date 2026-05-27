'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import type { Product } from '@/types';
import { TEMPLATES, getTemplate } from '@/lib/templates';
import TemplateRenderer, { type TemplateOverrides } from '@/components/templates/TemplateRenderer';
import TemplateThumbnail from './TemplateThumbnail';
import EditorPanel from './EditorPanel';
import { MOCK_PRODUCT, MOCK_OVERRIDES } from '@/lib/mock-product';

// ─── Carousel shown when no product is selected ──────────────────────────────
function TemplateCarousel({
  selectedTemplateId,
  onSelect,
}: {
  selectedTemplateId: string;
  onSelect: (id: string) => void;
}) {
  // Sync current index with selectedTemplateId (e.g. when user clicks top strip)
  const [current, setCurrent] = useState(() =>
    Math.max(0, TEMPLATES.findIndex((t) => t.id === selectedTemplateId))
  );

  useEffect(() => {
    const idx = TEMPLATES.findIndex((t) => t.id === selectedTemplateId);
    if (idx !== -1 && idx !== current) setCurrent(idx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId]);

  const total = TEMPLATES.length;
  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  // 3 cards: left, center, right
  const visible = [-1, 0, 1].map((offset) => ({
    template: TEMPLATES[(current + offset + total) % total],
    offset,
  }));

  // Card dimensions
  const CARD_W_CENTER = 260;
  const CARD_H_CENTER = 400;
  const CARD_W_SIDE   = 200;
  const CARD_H_SIDE   = 310;
  const SCALE_CENTER  = 0.165;
  const SCALE_SIDE    = 0.13;

  return (
    <div
      className="flex flex-col items-center justify-center h-full select-none"
      style={{ background: 'linear-gradient(160deg, #030712 0%, #2e1065 50%, #030712 100%)' }}
    >
      {/* Title */}
      <div className="mb-6 text-center px-4">
        <h2 className="text-xl font-extrabold text-white tracking-tight">Choisissez votre template</h2>
        <p className="text-violet-300 text-xs mt-1">
          {TEMPLATES.length} designs — ajoutez un produit pour l&apos;aperçu réel
        </p>
      </div>

      {/* Carousel */}
      <div className="relative flex items-center justify-center w-full" style={{ height: CARD_H_CENTER + 20 }}>
        {/* Left arrow */}
        <button
          onClick={prev}
          className="absolute left-4 z-30 flex items-center justify-center text-white transition-all"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            fontSize: 22, lineHeight: 1, border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          ‹
        </button>

        {/* Cards */}
        {visible.map(({ template, offset }) => {
          const isCenter   = offset === 0;
          const isSelected = template.id === selectedTemplateId;
          const cardW = isCenter ? CARD_W_CENTER : CARD_W_SIDE;
          const cardH = isCenter ? CARD_H_CENTER : CARD_H_SIDE;
          const scale = isCenter ? SCALE_CENTER : SCALE_SIDE;

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
                width: cardW,
                height: cardH,
                left: '50%',
                transform: `translateX(calc(-50% + ${offset * (CARD_W_CENTER * 0.92)}px))`,
                transition: 'all 0.38s cubic-bezier(.4,0,.2,1)',
                zIndex: isCenter ? 10 : 5,
                opacity: isCenter ? 1 : 0.55,
                cursor: 'pointer',
                borderRadius: 14,
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: isSelected
                  ? '0 0 0 3px #7C3AED, 0 24px 64px rgba(124,58,237,0.5)'
                  : isCenter
                  ? '0 20px 56px rgba(0,0,0,0.6)'
                  : '0 8px 24px rgba(0,0,0,0.35)',
              }}
            >
              {/* Real miniature via TemplateRenderer */}
              <div style={{ width: cardW, height: cardH, overflow: 'hidden', position: 'relative' }}>
                <TemplateRenderer
                  product={MOCK_PRODUCT}
                  template={template}
                  overrides={MOCK_OVERRIDES}
                  scale={scale}
                />
              </div>

              {/* Overlay gradient bas (pour le bouton) */}
              {isCenter && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 100,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: '0 16px 14px',
                  }}
                >
                  <div style={{
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: 700,
                    fontSize: 12,
                    marginBottom: 8,
                    letterSpacing: '0.04em',
                    textAlign: 'center',
                  }}>
                    {template.emoji} {template.name}
                  </div>
                  {/* Bouton HTML pleine page */}
                  <Link
                    href={`/preview/${template.id}`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      width: '100%',
                      textAlign: 'center',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.9)',
                      fontWeight: 600,
                      fontSize: 11,
                      padding: '7px 12px',
                      borderRadius: 7,
                      textDecoration: 'none',
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 12 }}>{'</>'}</span>
                    Voir la page HTML
                  </Link>
                  {/* Bouton ajouter produit */}
                  <Link
                    href={`/admin/products/new?template=${template.id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'center',
                      background: '#7C3AED',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 11,
                      padding: '8px 12px',
                      borderRadius: 7,
                      textDecoration: 'none',
                    }}
                  >
                    + Ajouter un produit
                  </Link>
                </div>
              )}

              {/* Selected badge */}
              {isSelected && isCenter && (
                <div style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: '#7C3AED',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '3px 7px',
                  borderRadius: 20,
                  zIndex: 20,
                }}>
                  ✓ Sélectionné
                </div>
              )}
            </div>
          );
        })}

        {/* Right arrow */}
        <button
          onClick={next}
          className="absolute right-4 z-30 flex items-center justify-center text-white transition-all"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            fontSize: 22, lineHeight: 1, border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          ›
        </button>
      </div>

      {/* Dots */}
      <div className="flex gap-1.5 mt-5">
        {TEMPLATES.map((t, i) => (
          <button
            key={i}
            onClick={() => { setCurrent(i); onSelect(t.id); }}
            style={{
              width: i === current ? 20 : 7,
              height: 7,
              borderRadius: 4,
              background: i === current ? '#7C3AED' : 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.22s',
              padding: 0,
            }}
          />
        ))}
      </div>

      <p className="mt-2.5 text-violet-300 text-xs font-semibold tracking-widest uppercase">
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
