'use client';

import React, { useState } from 'react';
import type { TemplateOverrides } from '@/components/templates/TemplateRenderer';
import type { TemplateConfig } from '@/lib/templates';

interface Props {
  overrides: TemplateOverrides;
  onChange: (overrides: TemplateOverrides & { save?: boolean }) => void;
  template: TemplateConfig;
  productSlug?: string;
}

type Tab = 'contenu' | 'sections' | 'exporter';

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between py-2.5 cursor-pointer select-none">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-violet-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

export default function EditorPanel({ overrides, onChange, template, productSlug }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('contenu');
  const [copied, setCopied] = useState(false);

  const update = (partial: Partial<TemplateOverrides>) => {
    onChange({ ...overrides, ...partial });
  };

  const updateSection = (key: keyof TemplateOverrides['sections'], value: boolean) => {
    onChange({
      ...overrides,
      sections: { ...overrides.sections, [key]: value },
    });
  };

  const handleCopyUrl = () => {
    if (productSlug) {
      const url = `${window.location.origin}/${productSlug}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'contenu', label: 'Contenu' },
    { key: 'sections', label: 'Sections' },
    { key: 'exporter', label: 'Exporter' },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200" style={{ width: '320px', flexShrink: 0 }}>
      {/* Template info */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">{template.emoji}</span>
          <div>
            <div className="text-sm font-bold text-gray-800">{template.name}</div>
            <div className="text-xs text-gray-500 capitalize">{template.style}</div>
          </div>
          <div
            className="ml-auto w-4 h-4 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: template.primaryColor }}
            title="Couleur principale"
          />
          <div
            className="w-4 h-4 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: template.accentColor }}
            title="Couleur accent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? 'text-violet-700 border-b-2 border-violet-600 bg-violet-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'contenu' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Titre Hero
              </label>
              <input
                type="text"
                value={overrides.heroTitle || ''}
                onChange={(e) => update({ heroTitle: e.target.value })}
                placeholder="Titre accrocheur de votre page..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Sous-titre
              </label>
              <textarea
                value={overrides.heroSubtitle || ''}
                onChange={(e) => update({ heroSubtitle: e.target.value })}
                placeholder="Description courte et convaincante..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder-gray-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Texte du bouton CTA
              </label>
              <input
                type="text"
                value={overrides.ctaText || ''}
                onChange={(e) => update({ ctaText: e.target.value })}
                placeholder="Acheter maintenant"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder-gray-400"
              />
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Les champs vides utilisent les données du produit par défaut.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'sections' && (
          <div>
            <p className="text-xs text-gray-500 mb-3">
              Activez ou désactivez les sections de votre page.
            </p>
            <div className="divide-y divide-gray-100">
              <Toggle
                checked={overrides.sections.painPoints}
                onChange={(v) => updateSection('painPoints', v)}
                label="Points de douleur"
              />
              <Toggle
                checked={overrides.sections.benefits}
                onChange={(v) => updateSection('benefits', v)}
                label="Avantages"
              />
              <Toggle
                checked={overrides.sections.testimonials}
                onChange={(v) => updateSection('testimonials', v)}
                label="Témoignages"
              />
              <Toggle
                checked={overrides.sections.faq}
                onChange={(v) => updateSection('faq', v)}
                label="FAQ"
              />
              <Toggle
                checked={overrides.sections.countdown}
                onChange={(v) => updateSection('countdown', v)}
                label="Compte à rebours"
              />
              <Toggle
                checked={overrides.sections.stock}
                onChange={(v) => updateSection('stock', v)}
                label="Stock limité"
              />
            </div>
          </div>
        )}

        {activeTab === 'exporter' && (
          <div className="space-y-4">
            <button
              onClick={() => onChange({ ...overrides, save: true })}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm text-sm"
            >
              ✓ Appliquer à la landing page
            </button>

            {productSlug && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  Ce template sera utilisé sur votre page publique :
                </p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <code className="text-xs text-gray-700 flex-1 truncate">
                    /{productSlug}
                  </code>
                  <button
                    onClick={handleCopyUrl}
                    className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors flex-shrink-0"
                  >
                    {copied ? '✓ Copié !' : 'Copier'}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800 font-medium">
                ℹ️ Le template et vos personnalisations seront sauvegardés dans la base de données et appliqués immédiatement sur la page publique.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
