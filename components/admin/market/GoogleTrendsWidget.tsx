'use client';

import { useState } from 'react';

const CATEGORIES = [
  'Tech & Gadgets',
  'Mode & Beauté',
  'Lifestyle & Maison',
  'Sport & Bien-être',
  'Art & Créativité',
] as const;

type Category = (typeof CATEGORIES)[number];

const TREND_IFRAMES: Record<Category, string> = {
  'Tech & Gadgets':
    'https://trends.google.com/trends/embed/explore/TIMESERIES?req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22gadget%22%2C%22geo%22%3A%22FR%22%2C%22time%22%3A%22today%203-m%22%7D%2C%7B%22keyword%22%3A%22accessoire%20tech%22%2C%22geo%22%3A%22FR%22%2C%22time%22%3A%22today%203-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%7D&tz=-120&gcs=GAAA',
  'Mode & Beauté':
    'https://trends.google.com/trends/embed/explore/TIMESERIES?req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22mode%20femme%22%2C%22geo%22%3A%22FR%22%2C%22time%22%3A%22today%203-m%22%7D%2C%7B%22keyword%22%3A%22skincare%22%2C%22geo%22%3A%22FR%22%2C%22time%22%3A%22today%203-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%7D&tz=-120&gcs=GAAA',
  'Lifestyle & Maison':
    'https://trends.google.com/trends/embed/explore/TIMESERIES?req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22d%C3%A9coration%20maison%22%2C%22geo%22%3A%22FR%22%2C%22time%22%3A%22today%203-m%22%7D%2C%7B%22keyword%22%3A%22lifestyle%22%2C%22geo%22%3A%22FR%22%2C%22time%22%3A%22today%203-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%7D&tz=-120&gcs=GAAA',
  'Sport & Bien-être':
    'https://trends.google.com/trends/embed/explore/TIMESERIES?req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22sport%20maison%22%2C%22geo%22%3A%22FR%22%2C%22time%22%3A%22today%203-m%22%7D%2C%7B%22keyword%22%3A%22bien-%C3%AAtre%22%2C%22geo%22%3A%22FR%22%2C%22time%22%3A%22today%203-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%7D&tz=-120&gcs=GAAA',
  'Art & Créativité':
    'https://trends.google.com/trends/embed/explore/TIMESERIES?req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22artisanat%22%2C%22geo%22%3A%22FR%22%2C%22time%22%3A%22today%203-m%22%7D%2C%7B%22keyword%22%3A%22cr%C3%A9ation%22%2C%22geo%22%3A%22FR%22%2C%22time%22%3A%22today%203-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%7D&tz=-120&gcs=GAAA',
};

const CATEGORY_ICONS: Record<Category, string> = {
  'Tech & Gadgets': '💻',
  'Mode & Beauté': '💄',
  'Lifestyle & Maison': '🏠',
  'Sport & Bien-être': '🏋️',
  'Art & Créativité': '🎨',
};

export default function GoogleTrendsWidget() {
  const [activeCategory, setActiveCategory] = useState<Category>('Tech & Gadgets');
  const [customKeyword, setCustomKeyword] = useState('');

  const handleCustomSearch = () => {
    if (!customKeyword.trim()) return;
    const encoded = encodeURIComponent(customKeyword.trim());
    window.open(
      `https://trends.google.fr/trends/explore?q=${encoded}&geo=FR`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="space-y-5">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeCategory === cat
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            <span>{CATEGORY_ICONS[cat]}</span>
            <span>{cat}</span>
          </button>
        ))}
      </div>

      {/* Trends iframe */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{CATEGORY_ICONS[activeCategory]}</span>
            <span className="font-semibold text-gray-800">{activeCategory}</span>
          </div>
          <span className="text-xs text-gray-400">Données Google Trends · France · 3 derniers mois</span>
        </div>
        <div className="p-1">
          <iframe
            key={activeCategory}
            src={TREND_IFRAMES[activeCategory]}
            width="100%"
            height="350"
            frameBorder="0"
            className="rounded-xl"
            title={`Google Trends — ${activeCategory}`}
          />
        </div>
      </div>

      {/* Custom search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Recherche personnalisée</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customKeyword}
            onChange={(e) => setCustomKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
            placeholder="Ex : collier magnétique, lampe UV..."
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleCustomSearch}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Voir les tendances →
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Ouvre Google Trends dans un nouvel onglet · France uniquement</p>
      </div>
    </div>
  );
}
