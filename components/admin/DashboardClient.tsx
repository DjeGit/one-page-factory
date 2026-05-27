'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Product } from '@/types';

interface WeeklyReport {
  resume?: string;
  top_produits?: string[];
  a_archiver?: string[];
  recommandations?: string[];
  insight_cle?: string;
}

interface HealthScores {
  [productId: string]: number | null;
}

interface DashboardClientProps {
  products: Product[];
}

export default function DashboardClient({ products }: DashboardClientProps) {
  const [healthScores, setHealthScores] = useState<HealthScores>({});
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [reportModal, setReportModal] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    if (products.length === 0) return;
    const fetchScores = async () => {
      const entries = await Promise.all(
        products.map(async (p) => {
          try {
            const res = await fetch(`/api/health-score/${p.id}`);
            if (!res.ok) return [p.id, null];
            const data = await res.json();
            return [p.id, typeof data.score === 'number' ? data.score : null];
          } catch {
            return [p.id, null];
          }
        })
      );
      setHealthScores(Object.fromEntries(entries));
    };
    fetchScores();
  }, [products]);

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

  const getScoreBadge = (score: number | null | undefined) => {
    if (score === null || score === undefined) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">
          —
        </span>
      );
    }
    if (score >= 80) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
          ✓ {score}
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
          {score}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        ⚠ {score}
      </span>
    );
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

      {/* Recent Products */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Produits récents</h2>
          <Link
            href="/admin/products"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Voir tout →
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-gray-500 mb-4">Aucun produit créé pour l&apos;instant</p>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Créer mon premier produit
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {products.map((product: Product) => (
              <div key={product.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                {/* Status dot */}
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    product.active ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />

                {/* Name and slug */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{product.name}</div>
                  <div className="text-sm text-gray-400 truncate">/{product.slug}</div>
                </div>

                {/* Health score */}
                <div className="flex-shrink-0">
                  {getScoreBadge(healthScores[product.id])}
                </div>

                {/* Price */}
                {product.price && (
                  <div className="text-gray-700 font-medium">{product.price.toFixed(2)}€</div>
                )}

                {/* Created at */}
                <div className="text-sm text-gray-400 hidden sm:block">
                  {new Date(product.created_at).toLocaleDateString('fr-FR')}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    Modifier
                  </Link>
                  <a
                    href={`/${product.slug}`}
                    target="_blank"
                    className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Voir
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
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
