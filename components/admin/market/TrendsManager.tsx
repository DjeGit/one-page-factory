'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TREND_CATEGORIES, buildTrendViews, categoryStats, trendLockState, type TrendCandidate, type TrendFilter, type TrendWeek } from '@/lib/trends';
import { networkErrorMessage, readApiError } from '@/components/admin/http';

interface ApiData {
  week: string;
  weeks: TrendWeek[];
  icons: Record<string, string>;
  candidates: TrendCandidate[];
  archive: TrendCandidate[];
  refusedBefore: Record<string, string>;
}

type Message = { kind: 'info' | 'error'; text: string };

const STATUS_LABEL: Record<string, string> = {
  candidate: 'Candidat',
  validated: 'Validé : en attente de traitement',
  in_progress: 'Fiche en cours de création',
  ready: 'Prête : mise en ligne programmée',
  live: 'En ligne',
  error: 'Échec',
};

const money = (n: number | null, cur: string) => (n == null ? '—' : `${n.toFixed(2).replace('.', ',')} ${cur}`);
const pct = (n: number | null) => (n == null ? '—' : `${Math.round(n * 1000) / 10} %`);
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR');

type Ship = 'fr' | 'es' | 'uk';
const SHIP_MARKETS: Ship[] = ['fr', 'es', 'uk'];
/** Livraison gratuite relevée : 'Oui' | 'Non' | null (pas encore relevée). Un clic passe à la valeur suivante. */
const shipValue = (c: TrendCandidate, m: Ship): 'Oui' | 'Non' | null => {
  const v = (c[`free_shipping_${m}` as const] ?? '').trim().toLowerCase();
  if (!v) return null;
  return /^(oui|yes|s[ií]|true|1|gratuit|free|gratis)/.test(v) ? 'Oui' : 'Non';
};
const nextShip = (v: 'Oui' | 'Non' | null): 'Oui' | 'Non' | null => (v === null ? 'Oui' : v === 'Oui' ? 'Non' : null);

export default function TrendsManager() {
  const [data, setData] = useState<ApiData | null>(null);
  const [filter, setFilter] = useState<TrendFilter>('active');
  // null = écran d'accueil (cartes des catégories) ; 'all' = toutes les catégories ; sinon le slug d'une catégorie.
  const [view, setView] = useState<string | null>(null);
  const category = view ?? 'all';
  // Semaine affichée (null = la plus récente). Gardée en référence pour que les relectures la conservent.
  const weekRef = useRef<string | null>(null);
  const [weekMenu, setWeekMenu] = useState(false);
  const weekMenuRef = useRef<HTMLDivElement>(null);
  // Clic ailleurs (ou toucher sur mobile) : le menu se ferme.
  useEffect(() => {
    if (!weekMenu) return;
    const close = (e: Event) => {
      if (weekMenuRef.current && !weekMenuRef.current.contains(e.target as Node)) setWeekMenu(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [weekMenu]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Numéro de la dernière lecture : une réponse lente ne doit jamais écraser une plus récente.
  const loadId = useRef(0);

  const load = useCallback(async (silent = false, weekParam?: string) => {
    const id = ++loadId.current;
    if (weekParam !== undefined) weekRef.current = weekParam;
    if (!silent) setLoading(true);
    try {
      const q = weekRef.current ? `?week=${encodeURIComponent(weekRef.current)}` : '';
      const res = await fetch(`/api/admin/trends${q}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await readApiError(res, 'Erreur de chargement'));
      const json: ApiData = await res.json();
      if (id === loadId.current) setData(json);
    } catch (e) {
      if (id === loadId.current) setMessage({ kind: 'error', text: networkErrorMessage(e, 'Erreur de chargement') });
    } finally {
      if (id === loadId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Applique une décision. Affichage immédiat, puis relecture silencieuse pour récupérer l'état réel (statut du pipeline). */
  const decide = async (ids: string[], decision: 'pending' | 'yes' | 'no', restoreToWeek?: string) => {
    if (!ids.length || busy) return;
    setBusy(true);
    if (!restoreToWeek) {
      setData((d) =>
        d && {
          ...d,
          candidates: d.candidates.map((c) =>
            ids.includes(c.id) ? { ...c, decision, status: decision === 'yes' ? 'validated' : 'candidate', error: null } : c,
          ),
        },
      );
    }
    try {
      const res = await fetch('/api/admin/trends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, decision, restoreToWeek }),
      });
      if (!res.ok) {
        setMessage({ kind: 'error', text: await readApiError(res, 'Décision non enregistrée') });
      }
    } catch (e) {
      setMessage({ kind: 'error', text: `Décision non enregistrée : ${networkErrorMessage(e)}` });
    } finally {
      // Dans tous les cas on relit l'état réel (annule l'affichage immédiat si l'enregistrement a échoué).
      await load(true);
      setBusy(false);
    }
  };

  /** OUI / NON / remise en attente sur une ligne, avec confirmation quand la fiche est déjà prête. */
  const decideOne = (c: TrendCandidate, target: 'yes' | 'no') => {
    const next = c.decision === target ? 'pending' : target;
    if (trendLockState(c) === 'confirm' && next !== 'yes') {
      if (!confirm(`La fiche de « ${c.name} » est déjà prête et sa mise en ligne est programmée. Annuler la mise en ligne ? (les fiches restent en brouillon)`)) return;
    }
    decide([c.id], next);
  };

  const decideBulk = (items: TrendCandidate[], decision: 'yes' | 'no', label: string) => {
    if (!items.length) return;
    const consequence =
      decision === 'yes'
        ? 'Chaque OUI lance la création automatique de la fiche, des photos, de la vidéo et du lien d’affiliation, puis la mise en ligne sur les 3 marchés.'
        : 'Ils seront archivés (jamais supprimés) et pourront revenir dans une prochaine recherche.';
    if (!confirm(`${decision === 'yes' ? 'OUI' : 'NON'} pour les ${items.length} produit(s) restant à choisir en « ${label} » ?\n\n${consequence}`)) return;
    decide(items.map((c) => c.id), decision);
  };

  const setShipping = async (c: TrendCandidate, m: Ship) => {
    const value = nextShip(shipValue(c, m));
    // Affichage immédiat, puis enregistrement.
    setData((d) => d && {
      ...d,
      candidates: d.candidates.map((x) => (x.id === c.id ? { ...x, [`free_shipping_${m}`]: value } : x)),
      archive: d.archive.map((x) => (x.id === c.id ? { ...x, [`free_shipping_${m}`]: value } : x)),
    });
    try {
      const res = await fetch('/api/admin/trends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, shipping: { [m]: value } }),
      });
      if (!res.ok) {
        setMessage({ kind: 'error', text: await readApiError(res, 'Livraison non enregistrée') });
        await load(true);
      }
    } catch (e) {
      setMessage({ kind: 'error', text: `Livraison non enregistrée : ${networkErrorMessage(e)}` });
      await load(true);
    }
  };

  const onImport = async (file: File) => {
    const ok = confirm(
      'Importer ce fichier ?\n\n' +
        '• les produits du fichier sont ajoutés ou mis à jour pour cette semaine (colonne OUI / NON prise en compte si remplie) ;\n' +
        '• les produits restés « à choisir » des semaines précédentes sont supprimés (les refusés restent archivés).',
    );
    if (!ok) {
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setImporting(true);
    try {
      const csv = await file.text();
      const res = await fetch('/api/admin/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      if (!res.ok) {
        setMessage({ kind: 'error', text: `Import impossible : ${await readApiError(res, 'Fichier refusé')}` });
      } else {
        const out = await res.json().catch(() => ({}));
        const extra = out.errors?.length ? ` · ${out.errors.length} ligne(s) ignorée(s) (${out.errors.slice(0, 2).join(' ')})` : '';
        setMessage({ kind: 'info', text: `Import : ${out.created ?? 0} créé(s), ${out.updated ?? 0} mis à jour, ${out.purged ?? 0} ancien(s) candidat(s) supprimé(s)${extra}.` });
        await load(true);
      }
    } catch (e) {
      setMessage({ kind: 'error', text: `Import impossible : ${networkErrorMessage(e)}` });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const views = useMemo(
    () => buildTrendViews(data?.candidates ?? [], data?.archive ?? [], filter, category),
    [data, filter, category],
  );
  const { counts, list: visible } = views;

  // Avancement du traitement automatique des produits retenus.
  const pipeline = useMemo(() => {
    const yes = (data?.candidates ?? []).filter((c) => c.decision === 'yes');
    const n = (s: string) => yes.filter((c) => c.status === s).length;
    return { waiting: n('validated'), inProgress: n('in_progress'), ready: n('ready'), live: n('live'), failed: n('error') };
  }, [data]);

  if (loading && !data) return <p className="text-gray-500" role="status">Chargement…</p>;

  const week = data?.week;
  const weeks = data?.weeks ?? [];
  const latestWeek = weeks[0]?.week ?? week;
  const cards = categoryStats(data?.candidates ?? [], data?.icons);
  const refusedCount = counts.no;
  const chip = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? 'bg-primary-600 border-primary-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:border-primary-400 hover:text-primary-700'
    }`;
  const goWeek = (w: string) => {
    if (w === week) return;
    setView(null);
    setFilter('active');
    load(false, w);
  };
  // La semaine affichée figure toujours dans la liste, même sans produit (début de semaine).
  const weekList = week && !weeks.some((w) => w.week === week) ? [{ week, total: 0, pending: 0, yes: 0 }, ...weeks] : weeks;

  return (
    <div className="space-y-5">
      {/* 1. Choix de la semaine : menu déroulant (s'ouvre au survol ou au clic) */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          ref={weekMenuRef}
          className="relative"
          onMouseEnter={() => setWeekMenu(true)}
          onMouseLeave={() => setWeekMenu(false)}
          onKeyDown={(e) => e.key === 'Escape' && setWeekMenu(false)}
        >
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={weekMenu}
            onClick={() => setWeekMenu((o) => !o)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:border-primary-400 transition-colors"
          >
            Semaine <span className="font-normal text-gray-500">du {week ? fmtDate(week) : '—'}</span>
            <svg className={`h-4 w-4 text-gray-400 transition-transform ${weekMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {weekMenu && (
            // pt-1 (et non mt) : pas de trou entre le bouton et la liste, sinon le survol se ferme en traversant.
            <div className="absolute left-0 top-full z-20 pt-1">
              <ul role="listbox" aria-label="Semaine" className="max-h-80 min-w-[16rem] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                {weekList.map((w) => {
                  const active = w.week === week;
                  return (
                    <li key={w.week} role="option" aria-selected={active}>
                      <button
                        type="button"
                        onClick={() => { setWeekMenu(false); goWeek(w.week); }}
                        className={`flex w-full items-center justify-between gap-4 px-4 py-2 text-left text-sm hover:bg-primary-50 ${active ? 'font-bold text-primary-700' : 'text-gray-700'}`}
                      >
                        <span>{fmtDate(w.week)}</span>
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          {w.total} produit{w.total > 1 ? 's' : ''}
                          {w.pending > 0 && <span className="rounded-full bg-amber-100 px-1.5 font-semibold text-amber-700">{w.pending} à choisir</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 2. Catégories (cartes) ou barre d'icônes quand on est dans une catégorie */}
      <div className="flex flex-wrap items-center gap-3">
        {view !== null && (
          <button type="button" onClick={() => { setView(null); setFilter('active'); }} className="text-sm font-medium text-primary-600 hover:text-primary-700">
            ← Toutes les catégories
          </button>
        )}
        {view !== null && (
          <div className="flex flex-wrap gap-1.5">
            {([
              ['active', `Actifs (${counts.active})`],
              ['pending', `À choisir (${counts.pending})`],
              ['yes', `Retenus (${counts.yes})`],
              ['no', `Refusés / archive (${counts.no})`],
            ] as [TrendFilter, string][]).map(([f, label]) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
                  filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <a
            href={`/api/admin/trends/export${week ? `?week=${week}` : ''}`}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50"
          >
            ⬇ Exporter (Excel)
          </a>
          <button
            type="button"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
          >
            {importing ? 'Import…' : '⬆ Importer'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            aria-label="Fichier CSV à importer"
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
        </div>
      </div>

      {view !== null && (
        <nav aria-label="Catégories" className="flex gap-2 overflow-x-auto pb-1">
          <button type="button" onClick={() => setView('all')} className={chip(view === 'all')}>
            <span aria-hidden>🗂️</span> Tous <span className={`text-xs ${view === 'all' ? 'text-primary-100' : 'text-gray-400'}`}>{filter === 'no' ? counts.no : counts.active}</span>
          </button>
          {cards.map((c) => (
            <button key={c.slug} type="button" onClick={() => setView(c.slug)} title={c.label} aria-current={view === c.slug ? 'page' : undefined} className={chip(view === c.slug)}>
              <span aria-hidden>{c.icon}</span>
              <span className="hidden md:inline">{c.label}</span>
              <span className={`text-xs ${view === c.slug ? 'text-primary-100' : 'text-gray-400'}`}>{c.total}</span>
            </button>
          ))}
        </nav>
      )}

      {(pipeline.waiting + pipeline.inProgress + pipeline.ready + pipeline.live + pipeline.failed > 0) && (
        <p className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
          <span className="font-semibold text-gray-600">Produits retenus :</span>
          {pipeline.waiting > 0 && <span>{pipeline.waiting} en attente de traitement</span>}
          {pipeline.inProgress > 0 && <span>{pipeline.inProgress} fiche(s) en cours</span>}
          {pipeline.ready > 0 && <span>{pipeline.ready} prête(s), mise en ligne programmée</span>}
          {pipeline.live > 0 && <span className="text-emerald-700">{pipeline.live} en ligne</span>}
          {pipeline.failed > 0 && <span className="text-red-700 font-semibold">{pipeline.failed} en échec (bouton « Réessayer »)</span>}
        </p>
      )}

      {message && (
        <div
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`px-4 py-2.5 border rounded-xl text-sm flex justify-between gap-3 ${
            message.kind === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Fermer le message" className="font-bold">×</button>
        </div>
      )}

      {view === null ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => { setFilter('active'); setView(c.slug); }}
                className={`group flex items-center gap-4 rounded-2xl border p-5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  c.total === 0 ? 'bg-white/60 border-dashed border-gray-300 hover:border-primary-400' : 'bg-white border-gray-200 hover:border-primary-400'
                }`}
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-3xl group-hover:bg-primary-100 transition-colors" aria-hidden>
                  {c.icon}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-gray-900 truncate">{c.label}</span>
                  {c.total === 0 ? (
                    <span className="text-sm text-gray-400">Aucun produit cette semaine</span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-700">{c.total} produit{c.total > 1 ? 's' : ''}</span>
                      {c.pending > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{c.pending} à choisir</span>}
                      {c.yes > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{c.yes} retenu{c.yes > 1 ? 's' : ''}</span>}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => { setFilter('active'); setView('all'); }} className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-primary-400 hover:shadow-sm transition-all">
              <span className="text-xl" aria-hidden>🗂️</span>
              <span className="font-semibold text-gray-900">Toutes les catégories</span>
              <span className="text-sm text-gray-500">({counts.active})</span>
            </button>
            <button type="button" onClick={() => { setFilter('no'); setView('all'); }} className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-primary-400 hover:shadow-sm transition-all">
              <span className="text-xl" aria-hidden>🚫</span>
              <span className="font-semibold text-gray-900">Refusés / archive</span>
              <span className="text-sm text-gray-500">({refusedCount})</span>
            </button>
          </div>
        </div>
      ) : (
      <>
      {visible.length === 0 && (
        <p className="text-gray-500 py-8 text-center">
          {filter === 'pending' && counts.pending === 0 && counts.yes > 0
            ? 'Tout est choisi pour cette semaine.'
            : 'Aucun produit dans cette vue.'}
        </p>
      )}

      {TREND_CATEGORIES.map((cat) => {
        const items = visible.filter((c) => c.category_slug === cat.slug);
        if (!items.length) return null;
        const inWeek = items.filter((c) => c.week === week);
        const pendingItems = inWeek.filter((c) => c.decision === 'pending');
        return (
          <section key={cat.slug} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-bold text-gray-900">
                {cat.label} <span className="text-gray-400 font-normal">({items.length})</span>
              </h2>
              {filter !== 'no' && pendingItems.length > 0 && (
                <div className="flex gap-2 text-xs">
                  <button type="button" disabled={busy} onClick={() => decideBulk(pendingItems, 'yes', cat.label)} className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 disabled:opacity-50">
                    Tout OUI ({pendingItems.length})
                  </button>
                  <button type="button" disabled={busy} onClick={() => decideBulk(pendingItems, 'no', cat.label)} className="px-2.5 py-1 rounded-md bg-red-50 text-red-700 font-semibold hover:bg-red-100 disabled:opacity-50">
                    Tout NON ({pendingItems.length})
                  </button>
                </div>
              )}
            </div>
            <ul className="divide-y divide-gray-100">
              {items.map((c) => {
                const archived = c.decision === 'no' && c.week !== week;
                const earlier = c.decision !== 'no' ? data?.refusedBefore[c.aliexpress_id] : undefined;
                const lock = trendLockState(c);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-gray-300 text-xl">
                      {c.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        '📦'
                      )}
                    </div>
                    <div className="min-w-[240px] flex-1">
                      {c.url_fr ? (
                        <a href={c.url_fr} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-900 hover:text-blue-600">
                          {c.name}
                        </a>
                      ) : (
                        <span className="font-semibold text-gray-900">{c.name}</span>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-1 text-xs">
                        {c.product_type && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c.product_type}</span>}
                        {c.decision === 'yes' && (
                          <span className={`px-2 py-0.5 rounded-full ${c.status === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                            {STATUS_LABEL[c.status] ?? c.status}
                          </span>
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
                    <div className="w-36 shrink-0" title="Livraison gratuite dans chaque pays (relevée sur la page AliExpress). Clic : pas relevé → Oui → Non.">
                      <div className="text-[11px] text-gray-500 mb-1">Livraison gratuite</div>
                      <div className="flex gap-1">
                        {SHIP_MARKETS.filter((m) => !(m === 'uk' && !c.url_uk && c.price_uk == null)).map((m) => {
                          const v = shipValue(c, m);
                          return (
                            <button
                              key={m}
                              type="button"
                              disabled={archived}
                              aria-label={`Livraison gratuite ${m.toUpperCase()} : ${v === 'Oui' ? 'oui' : v === 'Non' ? 'non' : 'pas encore relevée'}. Cliquer pour changer.`}
                              onClick={() => setShipping(c, m)}
                              className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
                                v === 'Oui'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : v === 'Non'
                                    ? 'bg-gray-100 text-gray-600 border-gray-300'
                                    : 'bg-white text-amber-700 border-amber-300 border-dashed'
                              }`}
                            >
                              {m.toUpperCase()} {v === 'Oui' ? '✓' : v === 'Non' ? '✗' : '?'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0 items-center">
                      {archived ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => latestWeek && decide([c.id], 'pending', latestWeek)}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Remettre en sélection
                        </button>
                      ) : lock === 'locked' ? (
                        <span className="text-xs text-gray-500 max-w-[11rem] text-right" title="Le traitement automatique est lancé : la décision ne peut plus être changée ici.">
                          {c.status === 'live' ? 'En ligne : décision verrouillée' : 'Fiche en cours : décision verrouillée'}
                        </span>
                      ) : (
                        <>
                          {c.decision === 'yes' && c.status === 'error' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => decide([c.id], 'yes')}
                              className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-red-300 text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                            >
                              Réessayer
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            aria-pressed={c.decision === 'yes'}
                            aria-label={`OUI pour ${c.name}`}
                            onClick={() => decideOne(c, 'yes')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold border disabled:opacity-60 ${
                              c.decision === 'yes' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                            }`}
                          >
                            OUI
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            aria-pressed={c.decision === 'no'}
                            aria-label={`NON pour ${c.name}`}
                            onClick={() => decideOne(c, 'no')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold border disabled:opacity-60 ${
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
      </>
      )}
    </div>
  );
}
