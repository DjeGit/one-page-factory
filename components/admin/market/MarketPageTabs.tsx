'use client';

import { useState } from 'react';
import MesRecherches from './MesRecherches';
import AmazonBestSellers from './AmazonBestSellers';
import GoogleTrendsWidget from './GoogleTrendsWidget';
import ApiSettingsTab from './ApiSettingsTab';

/**
 * Sprint 4 — réécriture en onglets alignée sur le plan approuvé :
 * Bestsellers Amazon / Google Shopping (Trends aujourd'hui, Shopping réel
 * dès DataForSEO activé — cf. note dans l'onglet) / Mes recherches /
 * Paramètres API. Remplace l'ancien trio Veille IA (GPT sans source) /
 * Tendances Live / Boîte à outils.
 */
type Tab = 'recherches' | 'amazon' | 'trends' | 'api';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'recherches', label: 'Mes recherches', emoji: '🔎' },
  { id: 'amazon', label: 'Bestsellers Amazon', emoji: '📦' },
  { id: 'trends', label: 'Google Trends', emoji: '📊' },
  { id: 'api', label: 'Paramètres API', emoji: '⚙️' },
];

export default function MarketPageTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('recherches');

  return (
    <div>
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

      {activeTab === 'recherches' && <MesRecherches />}
      {activeTab === 'amazon' && <AmazonBestSellers />}
      {activeTab === 'trends' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
            <span>ℹ️</span>
            <span>
              Tendances de recherche (gratuit, informatif). Pour de vraies données Google Shopping (prix, marchands),
              activez DataForSEO dans <a href="/admin/settings/integrations" className="underline font-semibold">Paramètres &gt; Intégrations</a> —
              les résultats apparaîtront dans l&apos;onglet « Mes recherches ».
            </span>
          </div>
          <GoogleTrendsWidget />
        </div>
      )}
      {activeTab === 'api' && <ApiSettingsTab />}
    </div>
  );
}
