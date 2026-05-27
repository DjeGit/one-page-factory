'use client';

import { useState } from 'react';
import MarketTable from '@/components/admin/MarketTable';
import TrendsDashboard from './TrendsDashboard';
import ToolsPanel from './ToolsPanel';

interface MarketProduct {
  id: string;
  category: string;
  name: string;
  description: string;
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
  best_offer: string;
  best_offer_price: number | null;
  platforms: string[];
  confidence_score: number;
  trend_score: number;
  source_notes: string;
  last_refreshed: string;
}

interface MarketPageTabsProps {
  products: MarketProduct[];
  lastRefreshed: string | null;
}

type Tab = 'veille' | 'tendances' | 'outils';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'veille', label: 'Veille IA', emoji: '🤖' },
  { id: 'tendances', label: 'Tendances Live', emoji: '📈' },
  { id: 'outils', label: 'Boîte à outils', emoji: '🧰' },
];

export default function MarketPageTabs({ products, lastRefreshed }: MarketPageTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('veille');

  return (
    <div>
      {/* Sticky tab bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 -mx-8 px-8 mb-6">
        <div className="flex gap-1 pt-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'veille' && (
        <MarketTable initialData={products} lastRefreshed={lastRefreshed} />
      )}
      {activeTab === 'tendances' && <TrendsDashboard />}
      {activeTab === 'outils' && <ToolsPanel />}
    </div>
  );
}
