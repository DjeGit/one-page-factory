'use client';

import { useState, useRef } from 'react';
import type { ImportRow } from '@/types';

interface CSVImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

interface ParsedRow extends ImportRow {
  _valid: boolean;
  _error?: string;
}

export default function CSVImportModal({ onClose, onImported }: CSVImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ created: number; skipped: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const REQUIRED_HEADERS = ['name', 'affiliate_url'];
  const OPTIONAL_HEADERS = ['price', 'original_price', 'image_url', 'description'];

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) throw new Error('Le CSV doit contenir au moins une ligne d\'en-têtes et une ligne de données');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const missingRequired = REQUIRED_HEADERS.filter(r => !headers.includes(r));
    if (missingRequired.length > 0) {
      throw new Error(`Colonnes requises manquantes : ${missingRequired.join(', ')}`);
    }

    return lines.slice(1).map((line, idx) => {
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });

      const valid = Boolean(row.name && row.affiliate_url);
      return {
        name: row.name || '',
        affiliate_url: row.affiliate_url || '',
        price: row.price || undefined,
        original_price: row.original_price || undefined,
        image_url: row.image_url || undefined,
        description: row.description || undefined,
        _valid: valid,
        _error: !valid ? `Ligne ${idx + 2}: name et affiliate_url requis` : undefined,
      };
    });
  };

  const handleParse = () => {
    setParseError(null);
    setParsed(null);
    try {
      const rows = parseCSV(csvText);
      setParsed(rows);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Erreur de parsing');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    const validRows = parsed.filter(r => r._valid);
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      });
      const data = await res.json();
      setResults({
        created: data.created ?? validRows.length,
        skipped: data.skipped ?? (parsed.length - validRows.length),
      });
      onImported();
    } catch {
      setResults({ created: 0, skipped: parsed.length });
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsed?.filter(r => r._valid).length ?? 0;
  const invalidCount = parsed?.filter(r => !r._valid).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-black text-gray-900">Importer CSV</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <strong>Format CSV requis :</strong>{' '}
            <code className="font-mono text-xs bg-blue-100 px-1 rounded">
              name, affiliate_url, price (optionnel), original_price (optionnel), image_url (optionnel), description (optionnel)
            </code>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Importer un fichier
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Textarea */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Coller le contenu CSV
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 font-mono text-xs resize-y min-h-[120px]"
              placeholder={`name,affiliate_url,price,description\nProduit Exemple,https://amazon.fr/dp/B0...,29.99,Description du produit`}
            />
          </div>

          {parseError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {parseError}
            </div>
          )}

          {/* Parse button */}
          {!results && (
            <button
              onClick={handleParse}
              disabled={!csvText.trim()}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Parser le CSV
            </button>
          )}

          {/* Preview table */}
          {parsed && !results && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
                  Aperçu — {parsed.length} ligne{parsed.length > 1 ? 's' : ''}
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  {validCount > 0 && <span className="text-green-600 font-semibold">✅ {validCount} valides</span>}
                  {invalidCount > 0 && <span className="text-red-500 font-semibold">⚠️ {invalidCount} ignorées</span>}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-500">#</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-500">Nom</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-500">URL Affilié</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-500">Prix</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-500">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsed.slice(0, 20).map((row, i) => (
                      <tr key={i} className={row._valid ? 'bg-white' : 'bg-red-50'}>
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-900 max-w-[150px] truncate">{row.name || '—'}</td>
                        <td className="px-3 py-2 text-gray-500 max-w-[150px] truncate">{row.affiliate_url || '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{row.price || '—'}</td>
                        <td className="px-3 py-2">
                          {row._valid ? (
                            <span className="text-green-600">✅</span>
                          ) : (
                            <span className="text-red-500" title={row._error}>⚠️</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 20 && (
                  <div className="px-3 py-2 text-center text-xs text-gray-400 border-t border-gray-100">
                    ... et {parsed.length - 20} autres lignes
                  </div>
                )}
              </div>

              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Import en cours...
                  </>
                ) : (
                  `Importer ${validCount} produit${validCount > 1 ? 's' : ''}`
                )}
              </button>
            </>
          )}

          {/* Results */}
          {results && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <div className="text-lg font-bold text-gray-900 mb-1">Import terminé</div>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="text-green-700 font-semibold">✅ {results.created} créés</span>
                {results.skipped > 0 && (
                  <span className="text-orange-600 font-semibold">⚠️ {results.skipped} ignorés</span>
                )}
              </div>
              <button
                onClick={onClose}
                className="mt-4 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
