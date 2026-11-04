/**
 * Rapport hebdomadaire du tableau de bord : normalisation de la réponse de /api/weekly-report.
 *
 * L'API renvoie { report: { summary, top_products, to_archive, recommendations, insight }, stats, ... }
 * (clés en anglais, générées par l'IA) alors que l'écran attendait des clés françaises à la racine :
 * le rapport s'affichait donc toujours vide. On accepte les deux formes.
 */
export interface WeeklyReport {
  resume?: string;
  top_produits?: string[];
  a_archiver?: string[];
  recommandations?: string[];
  insight_cle?: string;
}

const asText = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const asList = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const items = v.map((x) => (typeof x === 'string' ? x : x == null ? '' : JSON.stringify(x))).map((x) => x.trim()).filter(Boolean);
  return items.length ? items : undefined;
};

export function normalizeWeeklyReport(data: unknown): WeeklyReport {
  const root = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const r = (root.report && typeof root.report === 'object' ? root.report : root) as Record<string, unknown>;
  return {
    resume: asText(r.resume) ?? asText(r.summary),
    top_produits: asList(r.top_produits) ?? asList(r.top_products),
    a_archiver: asList(r.a_archiver) ?? asList(r.to_archive),
    recommandations: asList(r.recommandations) ?? asList(r.recommendations),
    insight_cle: asText(r.insight_cle) ?? asText(r.insight),
  };
}

export function isEmptyReport(r: WeeklyReport): boolean {
  return !r.resume && !r.top_produits && !r.a_archiver && !r.recommandations && !r.insight_cle;
}
