'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Product } from '@/types';
import type { Contact } from '@/types';
import { MARKETS } from '@/lib/market';
import ContactFormModal from './leads/ContactFormModal';
import ContactDetailPanel from './leads/ContactDetailPanel';

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

const TYPE_BADGES: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-600',
  client: 'bg-green-100 text-green-700',
  fournisseur: 'bg-orange-100 text-orange-700',
};

const TYPE_LABELS: Record<string, string> = {
  lead: 'Lead',
  client: 'Client',
  fournisseur: 'Fournisseur',
};

export default function LeadsManager({ products }: LeadsManagerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<LeadsStats>({ total: 0, this_week: 0, today: 0, top_product: '—' });
  const [filterProductId, setFilterProductId] = useState('');
  const [filterMarket, setFilterMarket] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProductId) params.set('product_id', filterProductId);
      if (filterMarket) params.set('market', filterMarket);
      if (filterType) params.set('contact_type', filterType);
      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const all: Contact[] = Array.isArray(data) ? data : (data.leads || []);
      setContacts(all);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const todayCount = all.filter((c) => new Date(c.created_at) >= today).length;
      const weekCount = all.filter((c) => new Date(c.created_at) >= weekAgo).length;

      const counts: Record<string, number> = {};
      all.forEach((c) => { if (c.product_id) counts[c.product_id] = (counts[c.product_id] || 0) + 1; });
      const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const topProduct = products.find((p) => p.id === topId)?.name || '—';

      setStats({ total: all.length, this_week: weekCount, today: todayCount, top_product: topProduct });
      setPage(0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filterProductId, filterMarket, filterType, products]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // "Nouveau contact" du dashboard renvoie vers /admin/leads?new=1 : ouvre
  // directement le formulaire de création à l'arrivée sur la page.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true);
      router.replace('/admin/leads');
    }
  }, [searchParams, router]);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce contact ? Cette action est irréversible.')) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== id));
        setSelectedContact(null);
      }
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

  const contactName = (c: Contact) => {
    const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
    return fullName || c.company || c.email || '(sans nom)';
  };

  const paginated = contacts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(contacts.length / PAGE_SIZE);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            Leads &amp; Emails
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-primary-100 text-primary-700">
              {stats.total}
            </span>
          </h1>
          <p className="text-gray-500 mt-1">Répertoire de vos leads, clients et fournisseurs</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau contact
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || contacts.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exporting ? 'Export...' : 'Exporter CSV'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total contacts', value: stats.total, color: 'text-gray-900' },
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

      {/* Filters */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <select
          value={filterMarket}
          onChange={(e) => { setFilterMarket(e.target.value); setPage(0); }}
          className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm"
        >
          <option value="">🌍 Tous les marchés</option>
          {MARKETS.map((m) => (
            <option key={m.code} value={m.code}>{m.flag} {m.label}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
          className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm"
        >
          <option value="">Tous les types</option>
          <option value="lead">Leads capturés</option>
          <option value="client">Clients</option>
          <option value="fournisseur">Fournisseurs</option>
        </select>
        <select
          value={filterProductId}
          onChange={(e) => { setFilterProductId(e.target.value); setPage(0); }}
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
        ) : contacts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📧</div>
            <p className="text-gray-500">Aucun contact pour le moment</p>
            <p className="text-sm text-gray-400 mt-1">Activez la capture d&apos;email dans vos produits ou ajoutez un contact manuellement</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom / Email</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Marché(s)</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Coordonnées</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((c) => {
                    const markets = c.markets?.length ? c.markets : c.market ? [c.market] : [];
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedContact(c)}
                            className="font-medium text-gray-900 hover:text-primary-600 transition-colors text-left"
                          >
                            {contactName(c)}
                          </button>
                          {c.contact_type === 'lead' && (
                            <div className="text-xs text-gray-400">
                              {products.find((p) => p.id === c.product_id)?.name ?? c.source_slug ?? ''}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${TYPE_BADGES[c.contact_type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {TYPE_LABELS[c.contact_type] ?? c.contact_type}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-1 flex-wrap">
                            {markets.length === 0 ? (
                              <span className="text-gray-300">—</span>
                            ) : (
                              markets.map((m) => (
                                <span key={m} title={MARKETS.find((x) => x.code === m)?.label} className="text-base leading-none">
                                  {MARKETS.find((x) => x.code === m)?.flag ?? m}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {c.email && <div className="truncate max-w-[180px]">{c.email}</div>}
                          {c.phone && <div className="text-gray-400">{c.phone}</div>}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {new Date(c.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, contacts.length)} sur {contacts.length} contacts
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

      {showForm && (
        <ContactFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchContacts(); }}
        />
      )}

      {editingContact && (
        <ContactFormModal
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onSaved={() => { setEditingContact(null); setSelectedContact(null); fetchContacts(); }}
        />
      )}

      {selectedContact && !editingContact && (
        <ContactDetailPanel
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onEdit={() => setEditingContact(selectedContact)}
          onDelete={() => handleDelete(selectedContact.id)}
        />
      )}
    </div>
  );
}
