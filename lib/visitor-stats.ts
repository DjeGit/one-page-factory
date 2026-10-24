/**
 * Calculs du tableau « Visiteurs » de l'admin (24/10/2026). Fonction pure :
 * reçoit les lignes déjà lues en base, ne touche ni à Supabase ni à l'horloge.
 */
import type { PageType } from '@/lib/visitor-tracking';

export interface VisitRow {
  visitor_id: string;
  session_id: string;
  path: string;
  page_type: PageType | string;
  referrer_host: string | null;
  duration_seconds: number | null;
}

export interface VisitorRow {
  visitor_id: string;
  visit_count: number;
}

export interface VisitorStats {
  visitors: number;
  sessions: number;
  pageViews: number;
  pagesPerSession: number;
  /** Temps moyen par page, sur les pages dont la durée est connue (secondes). */
  avgPageSeconds: number;
  /** Temps moyen par visite, somme des durées connues d'une visite (secondes). */
  avgSessionSeconds: number;
  newVisitors: number;
  returningVisitors: number;
  /** Part des visiteurs qui sont déjà venus au moins une autre fois (0 à 1). */
  returningRate: number;
  frequency: { label: string; count: number }[];
  topPages: { path: string; views: number; avgSeconds: number }[];
  byType: { type: string; views: number }[];
  referrers: { host: string; sessions: number }[];
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function computeVisitorStats(rows: VisitRow[], visitors: VisitorRow[], topLimit = 10): VisitorStats {
  const sessionIds = new Set<string>();
  const visitorIds = new Set<string>();
  const sessionSeconds = new Map<string, number>();
  const pageAgg = new Map<string, { views: number; seconds: number[] }>();
  const typeAgg = new Map<string, number>();
  const referrerSessions = new Map<string, Set<string>>();
  const knownDurations: number[] = [];

  for (const r of rows) {
    sessionIds.add(r.session_id);
    visitorIds.add(r.visitor_id);

    const page = pageAgg.get(r.path) ?? { views: 0, seconds: [] };
    page.views += 1;
    if (r.duration_seconds != null && r.duration_seconds > 0) {
      page.seconds.push(r.duration_seconds);
      knownDurations.push(r.duration_seconds);
      sessionSeconds.set(r.session_id, (sessionSeconds.get(r.session_id) ?? 0) + r.duration_seconds);
    }
    pageAgg.set(r.path, page);

    typeAgg.set(r.page_type, (typeAgg.get(r.page_type) ?? 0) + 1);

    if (r.referrer_host) {
      const set = referrerSessions.get(r.referrer_host) ?? new Set<string>();
      set.add(r.session_id);
      referrerSessions.set(r.referrer_host, set);
    }
  }

  const countByVisitor = new Map(visitors.map((v) => [v.visitor_id, v.visit_count]));
  let newVisitors = 0;
  let returningVisitors = 0;
  const buckets = { one: 0, two: 0, threeToFive: 0, sixPlus: 0 };
  for (const id of Array.from(visitorIds)) {
    const count = countByVisitor.get(id) ?? 1;
    if (count >= 2) returningVisitors += 1;
    else newVisitors += 1;
    if (count <= 1) buckets.one += 1;
    else if (count === 2) buckets.two += 1;
    else if (count <= 5) buckets.threeToFive += 1;
    else buckets.sixPlus += 1;
  }

  const total = visitorIds.size;
  return {
    visitors: total,
    sessions: sessionIds.size,
    pageViews: rows.length,
    pagesPerSession: sessionIds.size ? rows.length / sessionIds.size : 0,
    avgPageSeconds: avg(knownDurations),
    avgSessionSeconds: avg(Array.from(sessionSeconds.values())),
    newVisitors,
    returningVisitors,
    returningRate: total ? returningVisitors / total : 0,
    frequency: [
      { label: '1 visite', count: buckets.one },
      { label: '2 visites', count: buckets.two },
      { label: '3 à 5 visites', count: buckets.threeToFive },
      { label: '6 visites et plus', count: buckets.sixPlus },
    ],
    topPages: Array.from(pageAgg.entries())
      .map(([path, v]) => ({ path, views: v.views, avgSeconds: avg(v.seconds) }))
      .sort((a, b) => b.views - a.views)
      .slice(0, topLimit),
    byType: Array.from(typeAgg.entries())
      .map(([type, views]) => ({ type, views }))
      .sort((a, b) => b.views - a.views),
    referrers: Array.from(referrerSessions.entries())
      .map(([host, set]) => ({ host, sessions: set.size }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, topLimit),
  };
}
