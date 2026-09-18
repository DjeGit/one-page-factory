'use client';

import { useState } from 'react';
import Link from 'next/link';

interface WeeklyReport {
  resume?: string;
  top_produits?: string[];
  a_archiver?: string[];
  recommandations?: string[];
  insight_cle?: string;
}

export default function DashboardClient() {
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [reportModal, setReportModal] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const handleWeeklyReport = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const res = await fetch('/api/weekly-report', { method: 'POST' });
      if (!res.ok) throw new Error('Erreur lors de la génération du rapport');
      const data = await res.json();
      setReport(data);
      setReportModal(true);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <>
      {/* Header with weekly report button */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 mt-1">Vue d&apos;ensemble de votre activité</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleWeeklyReport}
            disabled={reportLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {reportLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Génération...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Rapport hebdomadaire
              </>
            )}
          </button>
          {reportError && (
            <p className="text-xs text-red-600">{reportError}</p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href="/admin/products/new"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl hover:border-primary-300 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 group-hover:bg-primary-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">Nouveau produit</div>
            <div className="text-gray-400 text-xs">Créer une page de vente</div>
          </div>
        </Link>
        <Link
          href="/admin/design"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl hover:border-violet-300 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600 group-hover:bg-violet-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">Design Studio</div>
            <div className="text-gray-400 text-xs">Personnaliser les templates</div>
          </div>
        </Link>
        <Link
          href="/admin/market"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">Étude de marché</div>
            <div className="text-gray-400 text-xs">Trouver des produits gagnants</div>
          </div>
        </Link>
        <Link
          href="/admin/leads?new=1"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl hover:border-green-300 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">Nouveau contact</div>
            <div className="text-gray-400 text-xs">Ajouter un client ou fournisseur</div>
          </div>
        </Link>
      </div>

      {/* Weekly Report Modal */}
      {reportModal && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-black text-gray-900">Rapport hebdomadaire</h2>
              <button
                onClick={() => setReportModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {report.resume && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Résumé</h3>
                  <p className="text-gray-800">{report.resume}</p>
                </div>
              )}
              {report.top_produits && report.top_produits.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Top produits</h3>
                  <ul className="space-y-1">
                    {report.top_produits.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-800">
                        <span className="text-green-500 font-bold mt-0.5">↑</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.a_archiver && report.a_archiver.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">À archiver</h3>
                  <ul className="space-y-1">
                    {report.a_archiver.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-800">
                        <span className="text-red-400 font-bold mt-0.5">↓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.recommandations && report.recommandations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Recommandations</h3>
                  <ul className="space-y-1">
                    {report.recommandations.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-800">
                        <span className="text-primary-500 font-bold mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.insight_cle && (
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-primary-700 uppercase tracking-wider mb-2">Insight clé</h3>
                  <p className="text-primary-800 font-medium">{report.insight_cle}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
