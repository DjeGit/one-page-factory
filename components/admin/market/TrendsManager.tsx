'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TREND_CATEGORIES, type TrendCandidate } from '@/lib/trends';

type Filter = 'active' | 'pending' | 'yes' | 'no';

interface ApiData {
  week: string;
  candidates: TrendCandidate[];
  archive: TrendCandidate[];
  refusedBefore: Record<string, string>;
}

const STATUS_LABEL: Record<string, string> = {
  candidate: 'Candidat',
  validated: 'Validé',
  in_progress: 'Fiche en cours',
  ready: 'Prête',
  live: 'En ligne',
  error: 'Échec',
};

const money = (n: number | null, cur: string) => (n == null ? '—' : `${n.toFixed(2).replace('.', ',')} ${cur}`);
const pct = (n: number | null) => (n == null ? '—' : `${Math.round(n * 1000) / 10} %`);
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR');

export default function TrendsManager() {
  const [data, setData] = useState<ApiData | null>(null);
  const [filter, setFilter] = useState<Filter>('active');
  const [category, setCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/trends', { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erreur de chargement');
      setData(await res.json());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (ids: string[], decision: 'pending' | 'yes' | 'no', restoreToWeek?: string) => {
    if (!ids.length) return;
    const res = await fetch('/api/admin/trends', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, decision, restoreToWeek }),
    });
    if (!res.ok) {
      setMessage((await res.json().catch(() => ({}))).error || 'Erreur');
      return;
    }
    await load();
  };

  const onImport = async (file: File) => {
    const csv = await file.text();
    const res = await fetch('/api/admin/trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(out.error || 'Import impossible');
    } else {
      const extra = out.errors?.length ? ` · ${out.errors.length} ligne(s) ignorée(s)` : '';
      setMessage(`Import : ${out.created} créé(s), ${out.updated} mis à jour, ${out.purged} ancien(s) candidat(s) supprimé(s)${extra}.`);
      await load();
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const all = data?.candidates ?? [];
  const counts = useMemo(
    () => ({
      pending: all.filter((c) => c.decision === 'pending').length,
      yes: all.filter((c) => c.decision === 'yes').length,
      no: all.filter((c) => c.decision === 'no').length + (data?.archive.length ?? 0),
    }),
    [all, data],
  );

  const visible = useMemo(() => {
    let list: TrendCandidate[];
    if (filter === 'no') {
      const ids = new Set(all.filter((c) => c.decision === 'no').map((c) => c.aliexpress_id));
      list = [...all.filter((c) => c.decision === 'no'), ...(data?.archive ?? []).filter((a) => !ids.has(a.aliexpress_id))];
    } else if (filter === 'pending') list = all.filter((c) => c.decision === 'pending');
    else if (filter === 'yes') list = all.filter((c) => c.decision === 'yes');
    else list = all.filter((c) => c.decision !== 'no');
    return category === 'all' ? list : list.filter((c) => c.category_slug === category);
  }, [all, data, filter, category]);

  if (loading && !data) return <p className="text-gray-500">Chargement…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-600">
          Semaine du <strong>{data ? fmtDate(data.week) : '—'}</strong>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['active', `Actifs (${counts.pending + counts.yes})`],
            ['pending', `À choisir (${counts.pending})`],
            ['yes', `Retenus (${counts.yes})`],
            ['no', `Refusés / archive (${counts.no})`],
          ] as [Filter, string][]).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
                filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="all">Toutes les catégories</option>
          {TREND_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.label}</option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <a
            href={`/api/admin/trends/export${data ? `?week=${data.week}` : ''}`}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50"
          >
            ⬇ Exporter (Excel)
          </a>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50"
          >
            ⬆ Importer
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
        </div>
      </div>

      {message && (
        <div className="px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex justify-between gap-3">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="font-bold">×</button>
        </div>
      )}

      {visible.length === 0 && <p className="text-gray-500 py-8 text-center">Aucun produit dans cette vue.</p>}

      {TREND_CATEGORIES.map((cat) => {
        const items = visible.filter((c) => c.category_slug === cat.slug);
        if (!items.length) return null;
        const inWeek = items.filter((c) => c.week === data?.week);
        return (
          <section key={cat.slug} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-bold text-gray-900">
                {cat.label} <span className="text-gray-400 font-normal">({items.length})</span>
              </h2>
              {filter !== 'no' && (
                <div className="flex gap-2 text-xs">
                  <button onClick={() => decide(inWeek.filter((c) => c.decision === 'pending').map((c) => c.id), 'yes')} className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100">
                    Tout OUI
                  </button>
                  <button onClick={() => decide(inWeek.filter((c) => c.decision === 'pending').map((c) => c.id), 'no')} className="px-2.5 py-1 rounded-md bg-red-50 text-red-700 font-semibold hover:bg-red-100">
                    Tout NON
                  </button>
                </div>
              )}
            </div>
            <ul className="divide-y divide-gray-100">
              {items.map((c) => {
                const archived = c.decision === 'no' && c.week !== data?.week;
                const earlier = c.decision !== 'no' ? data?.refusedBefore[c.aliexpress_id] : undefined;
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-gray-300 text-xl">
                      {c.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        '📦'
                      )}
                    </div>
                    <div className="min-w-[240px] flex-1">
                      <a href={c.url_fr ?? '#'} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-900 hover:text-blue-600">
                        {c.name}
                      </a>
                      <div className="flex flex-wrap gap-1.5 mt-1 text-xs">
                        {c.product_type && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c.product_type}</span>}
                        {c.decision === 'yes' && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{STATUS_LABEL[c.status] ?? c.status}</span>
                        )}
                        {c.status === 'error' && c.error && <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700">{c.error}</span>}
                        {earlier && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Déjà refusé le {fmtDate(earlier)}</span>}
                        {archived && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Archivé · semaine du {fmtDate(c.week)}</span>}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 leading-5 w-40">
                      <div>FR {money(c.price_fr, '€')}</div>
                      <div>ES {money(c.price_es, '€')}</div>
                      <div>UK {money(c.price_uk, '£')}</div>
                    </div>
                    <div className="text-xs text-gray-600 leading-5 w-32">
                      <div>Commission {pct(c.commission_fr)}{c.commission_uk != null && c.commission_uk !== c.commission_fr ? ` / UK ${pct(c.commission_uk)}` : ''}</div>
                      <div>Note {c.rating ?? '—'} · {c.sales != null ? `${c.sales.toLocaleString('fr-FR')}+ ventes` : '—'}</div>
                      {c.reviews != null && <div>{c.reviews.toLocaleString('fr-FR')} avis</div>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {archived ? (
                        <button
                          onClick={() => data && decide([c.id], 'pending', data.week)}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-300 bg-white hover:bg-gray-50"
                        >
                          Remettre en sélection
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => decide([c.id], c.decision === 'yes' ? 'pending' : 'yes')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold border ${
                              c.decision === 'yes' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                            }`}
                          >
                            OUI
                          </button>
                          <button
                            onClick={() => decide([c.id], c.decision === 'no' ? 'pending' : 'no')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold border ${
                              c.decision === 'no' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
                            }`}
                          >
                            NON
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
