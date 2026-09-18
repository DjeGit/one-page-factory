'use client';

import { MARKETS, type Market } from '@/lib/market';

interface MarketFlagsPickerProps {
  value: Market[];
  onChange: (markets: Market[]) => void;
  className?: string;
}

/**
 * Sélecteur de marché(s) à icônes drapeaux — utilisé pour rattacher un
 * contact du Répertoire à un, deux, ou les trois marchés à la fois
 * (idée de Jerome : "on peut imaginer une icone drapaux que je selectionne").
 */
export default function MarketFlagsPicker({ value, onChange, className }: MarketFlagsPickerProps) {
  const toggle = (code: Market) => {
    onChange(value.includes(code) ? value.filter((m) => m !== code) : [...value, code]);
  };

  const allSelected = value.length === MARKETS.length;
  const toggleAll = () => onChange(allSelected ? [] : MARKETS.map((m) => m.code));

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className ?? ''}`}>
      {MARKETS.map((m) => {
        const selected = value.includes(m.code);
        return (
          <button
            key={m.code}
            type="button"
            onClick={() => toggle(m.code)}
            title={m.label}
            aria-pressed={selected}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
              selected
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
            }`}
          >
            <span className="text-base leading-none">{m.flag}</span>
            {m.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={toggleAll}
        title="Sélectionner les 3 marchés"
        aria-pressed={allSelected}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
          allSelected
            ? 'border-primary-500 bg-primary-50 text-primary-700'
            : 'border-gray-200 text-gray-500 hover:border-gray-300'
        }`}
      >
        🌍 Les 3
      </button>
    </div>
  );
}
