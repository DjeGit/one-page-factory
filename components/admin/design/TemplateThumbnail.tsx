'use client';

import React from 'react';
import type { TemplateConfig } from '@/lib/templates';
import type { Product } from '@/types';
import TemplateRenderer from '@/components/templates/TemplateRenderer';

interface Props {
  template: TemplateConfig;
  isSelected: boolean;
  onClick: () => void;
  product?: Product;
}

export default function TemplateThumbnail({ template, isSelected, onClick, product }: Props) {
  const colorMap: Record<string, string> = {
    'from-gray-950': '#030712',
    'to-violet-950': '#2e1065',
    'from-white': '#ffffff',
    'to-gray-50': '#f9fafb',
    'from-red-950': '#450a0a',
    'to-orange-900': '#431407',
    'from-emerald-950': '#022c22',
    'to-green-900': '#14532d',
    'from-blue-950': '#172554',
    'to-cyan-900': '#164e63',
    'from-stone-950': '#0c0a09',
    'to-amber-950': '#451a03',
    'from-purple-50': '#faf5ff',
    'to-pink-50': '#fdf2f8',
    'from-amber-400': '#fbbf24',
    'to-orange-500': '#f97316',
    'to-blue-50': '#eff6ff',
    'to-slate-900': '#0f172a',
  };

  const fromColor = colorMap[template.bgFrom] || '#111827';
  const toColor = colorMap[template.bgTo] || '#1f2937';

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex flex-col items-center gap-2 p-1 rounded-xl transition-all duration-150 ${
        isSelected
          ? 'ring-2 ring-violet-500 ring-offset-2 shadow-lg'
          : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1'
      }`}
      title={template.name}
    >
      {/* Preview box */}
      <div
        style={{ width: '160px', height: '110px', position: 'relative', overflow: 'hidden', borderRadius: '8px' }}
      >
        {product ? (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <TemplateRenderer product={product} template={template} scale={0.18} />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${fromColor} 0%, ${toColor} 100%)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '24px' }}>{template.emoji}</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: template.textColor === 'white' ? '#fff' : '#111827',
                textAlign: 'center',
                padding: '0 8px',
              }}
            >
              {template.name}
            </span>
          </div>
        )}
      </div>

      {/* Template name label */}
      <div className="text-center">
        <div className="text-xs font-semibold text-gray-700 leading-tight">
          {template.emoji} {template.name}
        </div>
      </div>
    </button>
  );
}
