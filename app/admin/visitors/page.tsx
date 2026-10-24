import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { computeVisitorStats, type VisitRow, type VisitorRow } from '@/lib/visitor-stats';
import StatsCard from '@/components/admin/StatsCard';

export const dynamic = 'force-dynamic';

const PAGE = 1000;
const MAX_ROWS = 50000;
const PERIODS = [7, 30, 90] as const;

const TYPE_LABELS: Record<string, string> = {
  home: 'Accueil',
  product: 'Fiches produit',
  category: 'Catégories',
  catalog: 'Catalogue',
  top_sales: 'Top ventes',
  blog: 'Blog (liste)',
  blog_post: 'Articles de blog',
  guide: "Guide d'achat",
  guide_post: "Guides d'achat par produit",
  info: 'Pages d’information',
  legal: 'Pages légales',
  other: 'Autres',
};

function fmtSeconds(s: number): string {
  if (!s || s < 1) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m} min ${sec.toString().padStart(2, '0')} s` : `${sec} s`;
}

function pct(n: number): string {
  return `${Math.round(n * 100)} %`;
}

interface Props {
  searchParams: { days?: string };
}

/**
 * Nav admin — Visiteurs : mesure d'audience maison, alimentée uniquement
 * pour les visiteurs ayant accepté les cookies (lib/visitor-tracking.ts).
 * Les chiffres ne couvrent donc QUE ces visiteurs, pas tout le trafic.
 * Filtré par marché actif, comme Analytics.
 */
export default async function VisitorsPage({ searchParams }: Props) {
  const market = getActiveMarket();
  const requested = Number(searchParams.days);
  const days = (PERIODS as readonly number[]).includes(requested) ? requested : 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const sb = getSupabaseAdmin();
  const rows: VisitRow[] = [];
  let truncated = false;
  let error: string | null = null;

  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error: err } = await sb
      .from('page_visits')
      .select('visitor_id, session_id, path, page_type, referrer_host, duration_seconds')
      .eq('market', market)
      .gte('entered_at', since)
      .order('entered_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (err) {
      error = err.message;
      break;
    }
    rows.push(...((data ?? []) as VisitRow[]));
    if (!data || data.length < PAGE) break;
    if (from + PAGE >= MAX_ROWS) truncated = true;
  }

  let visitors: VisitorRow[] = [];
  if (!error) {
    const { data } = await sb
      .from('visitors')
      .select('visitor_id, visit_count')
      .eq('market', market)
      .gte('last_seen', since)
      .limit(MAX_ROWS);
    visitors = (data ?? []) as VisitorRow[];
  }

  const stats = computeVisitorStats(rows, visitors);
  const maxFreq = Math.max(1, ...stats.frequency.map((f) => f.count));

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Visiteurs</h1>
          <p className="text-gray-500 mt-1 max-w-2xl">
            Marché {market.toUpperCase()}. Chiffres limités aux visiteurs qui ont accepté les cookies : ils indiquent
            des comportements, pas le trafic total (voir Analytics pour les vues par produit).
          </p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <a
              key={p}
              href={`/admin/visitors?days=${p}`}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                p === days ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
            >
              {p} jours
            </a>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Lecture impossible : {error}. La migration <code>20261024000001_visitor_tracking.sql</code> est-elle appliquée dans Supabase ?
        </div>
      )}
      {truncated && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Plus de {MAX_ROWS.toLocaleString('fr-FR')} pages vues sur la période : les chiffres portent sur les plus récentes.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatsCard title="Visiteurs" value={stats.visitors.toLocaleString('fr-FR')} subtitle={`${stats.sessions.toLocaleString('fr-FR')} visites`} color="primary" icon={<span>👥</span>} />
        <StatsCard
          title="Visiteurs qui reviennent"
          value={pct(stats.returningRate)}
          subtitle={`${stats.returningVisitors} récurrents, ${stats.newVisitors} nouveaux`}
          color="green"
          icon={<span>🔁</span>}
        />
        <StatsCard
          title="Pages par visite"
          value={stats.pagesPerSession.toFixed(1)}
          subtitle={`${stats.pageViews.toLocaleString('fr-FR')} pages vues`}
          color="blue"
          icon={<span>📄</span>}
        />
        <StatsCard
          title="Temps par visite"
          value={fmtSeconds(stats.avgSessionSeconds)}
          subtitle={`${fmtSeconds(stats.avgPageSeconds)} par page`}
          color="orange"
          icon={<span>⏱️</span>}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Fréquence de retour</h2>
          <p className="text-sm text-gray-500 mb-4">Nombre de visites cumulées des visiteurs actifs sur la période.</p>
          <ul className="space-y-3">
            {stats.frequency.map((f) => (
              <li key={f.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{f.label}</span>
                  <span className="font-semibold text-gray-900">{f.count}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-primary-600" style={{ width: `${(f.count / maxFreq) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Ce qu&apos;ils regardent</h2>
          <p className="text-sm text-gray-500 mb-4">Pages vues par type de page.</p>
          <table className="w-full text-sm">
            <tbody>
              {stats.byType.map((t) => (
                <tr key={t.type} className="border-t border-gray-100 first:border-0">
                  <td className="py-2 text-gray-700">{TYPE_LABELS[t.type] ?? t.type}</td>
                  <td className="py-2 text-right font-semibold text-gray-900">{t.views}</td>
                  <td className="py-2 pl-3 text-right text-gray-500 w-16">{pct(stats.pageViews ? t.views / stats.pageViews : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Pages les plus vues</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-2 font-medium">Page</th>
                <th className="pb-2 font-medium text-right">Vues</th>
                <th className="pb-2 font-medium text-right">Temps moyen</th>
              </tr>
            </thead>
            <tbody>
              {stats.topPages.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-gray-500">Aucune donnée pour l&apos;instant.</td>
                </tr>
              )}
              {stats.topPages.map((p) => (
                <tr key={p.path} className="border-t border-gray-100">
                  <td className="py-2 text-gray-800 break-all">{p.path}</td>
                  <td className="py-2 text-right font-semibold text-gray-900">{p.views}</td>
                  <td className="py-2 text-right text-gray-600">{fmtSeconds(p.avgSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">D&apos;où ils viennent</h2>
          <p className="text-sm text-gray-500 mb-4">Sites d&apos;origine des visites (hors accès direct et liens internes).</p>
          <table className="w-full text-sm">
            <tbody>
              {stats.referrers.length === 0 && (
                <tr>
                  <td className="py-2 text-gray-500">Aucune source externe enregistrée.</td>
                </tr>
              )}
              {stats.referrers.map((r) => (
                <tr key={r.host} className="border-t border-gray-100 first:border-0">
                  <td className="py-2 text-gray-800">{r.host}</td>
                  <td className="py-2 text-right font-semibold text-gray-900">{r.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
