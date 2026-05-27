'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Product } from '@/types';

interface Lead {
  id: string;
  email: string;
  product_id: string;
  source_slug: string;
  created_at: string;
}

interface LeadsStats {
  total: number;
  this_week: number;
  today: number;
  top_product: string;
}

interface LeadsManagerProps {
  products: Product[];
}

const PAGE_SIZE = 50;

export default function LeadsManager({ products }: LeadsManagerProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadsStats>({ total: 0, this_week: 0, today: 0, top_product: '—' });
  const [filterProductId, setFilterProductId] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProductId) params.set('product_id', filterProductId);
      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const allLeads: Lead[] = Array.isArray(data) ? data : (data.leads || []);
      setLeads(allLeads);

      // Compute stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const todayCount = allLeads.filter(l => new Date(l.created_at) >= today).length;
      const weekCount = allLeads.filter(l => new Date(l.created_at) >= weekAgo).length;

      // Top product
      const counts: Record<string, number> = {};
      allLeads.forEach(l => { counts[l.product_id] = (counts[l.product_id] || 0) + 1; });
      const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const topProduct = products.find(p => p.id === topId)?.name || '—';

      setStats({ total: allLeads.length, this_week: weekCount, today: todayCount, top_product: topProduct });
      setPage(0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filterProductId, products]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) setLeads(prev => prev.filter(l => l.id !== id));
    } catch {
      // silently fail
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filterProductId) params.set('product_id', filterProductId);
      const res = await fetch(`/api/leads/export?${params}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setExporting(false);
    }
  };

  const productName = (id: string) => {
    const found = products.find(p => p.id === id);
    return found ? found.name : id;
  };

  const paginated = leads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(leads.length / PAGE_SIZE);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            Leads &amp; Emails
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-primary-100 text-primary-700">
              {stats.total}
            </span>
          </h1>
          <p className="text-gray-500 mt-1">Gérez vos contacts et leads capturés</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || leads.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {exporting ? 'Export...' : 'Exporter CSV'}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total leads', value: stats.total, color: 'text-gray-900' },
          { label: 'Cette semaine', value: stats.this_week, color: 'text-primary-600' },
          { label: "Aujourd'hui", value: stats.today, color: 'text-green-600' },
          { label: 'Top produit', value: stats.top_product, color: 'text-orange-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color} truncate`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-5 flex items-center gap-3">
        <label className="text-sm font-semibold text-gray-700">Filtrer par produit :</label>
        <select
          value={filterProductId}
          onChange={(e) => setFilterProductId(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm"
        >
          <option value="">Tous les produits</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <svg className="animate-spin h-6 w-6 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Chargement...
          </div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📧</div>
            <p className="text-gray-500">Aucun lead capturé pour le moment</p>
            <p className="text-sm text-gray-400 mt-1">Activez la capture d&apos;email dans vos produits</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produit source</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date de capture</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{lead.email}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-700">{productName(lead.product_id)}</span>
                        <div className="text-xs text-gray-400">/{lead.source_slug}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, leads.length)} sur {leads.length} leads
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Précédent
                  </button>
                  <span className="text-sm text-gray-500">Page {page + 1}/{totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
