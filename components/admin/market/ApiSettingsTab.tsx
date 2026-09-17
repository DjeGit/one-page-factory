'use client';

import ToolsPanel from './ToolsPanel';

/**
 * Onglet "Paramètres API" — Sprint 4. Pas de duplication : le vrai écran
 * de gestion des intégrations (toggle + test de connexion) vit dans
 * Admin > Paramètres > Intégrations (Sprint 3, lib/integrations/registry.ts).
 * Ici, juste un lien direct + les outils externes (spy ads, veille
 * manuelle) qui ne sont pas des sources branchées au registre.
 */
export default function ApiSettingsTab() {
  return (
    <div className="space-y-6">
      <a
        href="/admin/settings/integrations"
        className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-6 hover:border-primary-300 transition-colors group"
      >
        <div>
          <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
            Gérer les sources de données &amp; canaux sociaux
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Activer/désactiver Keepa, DataForSEO, Amazon Creators, AWIN, Google Trends... et tester chaque connexion.
          </p>
        </div>
        <svg className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>

      <div>
        <h3 className="font-bold text-gray-900 mb-3">Outils externes (veille manuelle)</h3>
        <ToolsPanel />
      </div>
    </div>
  );
}
