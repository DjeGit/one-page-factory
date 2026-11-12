/**
 * Tendance de la semaine : types et utilitaires (sans dépendance, testables seuls).
 */

export const TREND_CATEGORIES: { slug: string; label: string }[] = [
  { slug: 'tech', label: 'Tech' },
  { slug: 'mode-beaute', label: 'Mode & Beauté' },
  { slug: 'maison-deco', label: 'Maison & Déco' },
  { slug: 'sport-bien-etre', label: 'Sport & Bien-être' },
  { slug: 'art-design', label: 'Art & Design' },
  { slug: 'loisirs', label: 'Loisirs' },
  { slug: 'jeux-jouets', label: 'Jeux & Jouets' },
  { slug: 'puericulture', label: 'Bébé & Puériculture' },
];

export type TrendDecision = 'pending' | 'yes' | 'no';

export interface TrendCandidate {
  id: string;
  aliexpress_id: string;
  week: string;
  category_slug: string;
  name: string;
  product_type: string | null;
  image_url: string | null;
  price_fr: number | null;
  price_es: number | null;
  price_uk: number | null;
  commission_fr: number | null;
  commission_uk: number | null;
  rating: number | null;
  reviews: number | null;
  sales: number | null;
  seller: string | null;
  free_shipping_fr: string | null;
  free_shipping_es: string | null;
  free_shipping_uk: string | null;
  url_fr: string | null;
  url_uk: string | null;
  note: string | null;
  decision: TrendDecision;
  decided_at: string | null;
  status: string;
  error: string | null;
}

/** Lundi (UTC) de la semaine d'une date, au format AAAA-MM-JJ. */
export function mondayOf(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7; // dimanche = 7
  x.setUTCDate(x.getUTCDate() - (day - 1));
  return x.toISOString().slice(0, 10);
}

/** Identifiant AliExpress d'une adresse de fiche produit. */
export function extractAliexpressId(url: string | null | undefined): string | null {
  const m = (url || '').match(/\/item\/(\d{6,})/);
  return m ? m[1] : null;
}

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const CATEGORY_BY_LABEL: Record<string, string> = Object.fromEntries(
  TREND_CATEGORIES.flatMap((c) => [
    [norm(c.label), c.slug],
    [c.slug, c.slug],
  ]),
);

export function categorySlugFromLabel(label: string): string | null {
  return CATEGORY_BY_LABEL[norm(label)] ?? null;
}

/** Nombre au format français ou anglais ; « 7 % » → 7 ; « 1.234,56 » → 1234.56 ; « 1,234.56 » → 1234.56. */
export function parseNumber(v: string | null | undefined): number | null {
  if (v == null) return null;
  let s = String(v).replace(/[€£$%\s ]/g, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    // Les deux séparateurs : le dernier est le séparateur décimal, l'autre sépare les milliers.
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    // Virgule seule : décimale si 1 ou 2 chiffres derrière (12,5 / 12,50), sinon milliers (1,234).
    s = /,\d{1,2}$/.test(s) ? s.replace(/,(?=\d{1,2}$)/, '.').replace(/,/g, '') : s.replace(/,/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Commission : 0.07, 7 ou « 7 % » donnent toujours 0.07 (avec le signe %, « 1 % » = 0.01). */
export function parseCommission(v: string | null | undefined): number | null {
  const n = parseNumber(v);
  if (n == null) return null;
  if (String(v).includes('%')) return Math.round(n * 100) / 10000;
  return n > 1 ? Math.round(n * 100) / 10000 : n;
}

/** Analyse un CSV (séparateur ; , ou tabulation, guillemets doublés). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const sep = [';', '\t', ','].sort(
    (a, b) => firstLine.split(b).length - firstLine.split(a).length,
  )[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

export interface ParsedTrendRow {
  aliexpress_id: string;
  category_slug: string;
  name: string;
  price_fr: number | null;
  price_es: number | null;
  price_uk: number | null;
  commission_fr: number | null;
  commission_uk: number | null;
  rating: number | null;
  reviews: number | null;
  sales: number | null;
  url_fr: string;
  url_uk: string | null;
  decision: TrendDecision | null; // null = colonne vide : on ne touche pas à la décision
}

export const CSV_HEADERS = [
  'Date', 'Catégorie', 'Produit', 'Prix FR (€)', 'Prix ES (€)', 'Prix UK (£)',
  'Commission FR/ES', 'Commission UK', 'Note (/5)', 'Avis', 'Ventes (min.)',
  'Lien produit FR/ES', 'Lien produit UK', 'Décision (OUI / NON)',
];

export function parseTrendCsv(text: string): { rows: ParsedTrendRow[]; errors: string[] } {
  const table = parseCsv(text);
  const errors: string[] = [];
  if (table.length < 2) return { rows: [], errors: ['Fichier vide ou sans ligne de données.'] };
  const header = table[0].map(norm);
  const idx = (pred: (h: string) => boolean) => header.findIndex(pred);
  const col = {
    cat: idx((h) => h.startsWith('categorie')),
    name: idx((h) => h.startsWith('produit')),
    pfr: idx((h) => h.startsWith('prix fr')),
    pes: idx((h) => h.startsWith('prix es')),
    puk: idx((h) => h.startsWith('prix uk')),
    cfr: idx((h) => h.startsWith('commission fr') || h === 'commission'),
    cuk: idx((h) => h.startsWith('commission uk')),
    rating: idx((h) => h.startsWith('note')),
    reviews: idx((h) => h === 'avis' || h.startsWith('avis')),
    sales: idx((h) => h.startsWith('ventes')),
    urlfr: idx((h) => h.startsWith('lien produit fr') || h === 'lien produit' || h === 'lien'),
    urluk: idx((h) => h.startsWith('lien produit uk')),
    dec: idx((h) => h.startsWith('decision')),
  };
  if (col.urlfr < 0 || col.name < 0) {
    return { rows: [], errors: ['Colonnes « Produit » et « Lien produit » introuvables.'] };
  }
  const rows: ParsedTrendRow[] = [];
  table.slice(1).forEach((r, i) => {
    const get = (c: number) => (c >= 0 ? (r[c] ?? '').trim() : '');
    const urlfr = get(col.urlfr);
    const id = extractAliexpressId(urlfr);
    if (!id) {
      errors.push(`Ligne ${i + 2} : lien produit invalide, ignorée.`);
      return;
    }
    const cat = categorySlugFromLabel(get(col.cat));
    if (!cat) {
      errors.push(`Ligne ${i + 2} : catégorie « ${get(col.cat)} » inconnue, ignorée.`);
      return;
    }
    const d = norm(get(col.dec));
    const urluk = get(col.urluk);
    rows.push({
      aliexpress_id: id,
      category_slug: cat,
      name: get(col.name),
      price_fr: parseNumber(get(col.pfr)),
      price_es: parseNumber(get(col.pes)),
      price_uk: parseNumber(get(col.puk)),
      commission_fr: parseCommission(get(col.cfr)),
      commission_uk: parseCommission(get(col.cuk)),
      rating: parseNumber(get(col.rating)),
      reviews: parseNumber(get(col.reviews)),
      sales: parseNumber(get(col.sales)),
      url_fr: urlfr,
      url_uk: /^https?:\/\//.test(urluk) ? urluk : null,
      decision: d === 'oui' || d === 'yes' ? 'yes' : d === 'non' || d === 'no' ? 'no' : null,
    });
  });
  return { rows, errors };
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const fmtNum = (n: number | null) => (n == null ? '' : String(n).replace('.', ','));

/** CSV (séparateur « ; », virgule décimale) lisible directement par Excel en français. */
export function toTrendCsv(rows: TrendCandidate[]): string {
  const label = (slug: string) => TREND_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
  const lines = [CSV_HEADERS.map(csvCell).join(';')];
  for (const r of rows) {
    lines.push(
      [
        r.week, label(r.category_slug), r.name,
        fmtNum(r.price_fr), fmtNum(r.price_es), fmtNum(r.price_uk),
        r.commission_fr == null ? '' : `${Math.round(r.commission_fr * 1000) / 10} %`,
        r.commission_uk == null ? '' : `${Math.round(r.commission_uk * 1000) / 10} %`,
        fmtNum(r.rating), r.reviews ?? '', r.sales ?? '',
        r.url_fr ?? '', r.url_uk ?? '',
        r.decision === 'yes' ? 'OUI' : r.decision === 'no' ? 'NON' : '',
      ].map(csvCell).join(';'),
    );
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// ─────────────────────────────────────────────────────────────────────────────
// Vues de l'écran « Tendance de la semaine » (fonctions pures, testées)
// ─────────────────────────────────────────────────────────────────────────────

export type TrendFilter = 'active' | 'pending' | 'yes' | 'no';

export interface TrendViews {
  list: TrendCandidate[];
  counts: { active: number; pending: number; yes: number; no: number };
}

/**
 * Produits refusés = refusés de la semaine + archive des semaines précédentes, sans doublon
 * (un même produit AliExpress refusé plusieurs semaines de suite n'apparaît qu'une fois).
 */
export function refusedList(candidates: TrendCandidate[], archive: TrendCandidate[]): TrendCandidate[] {
  const out = candidates.filter((c) => c.decision === 'no');
  const seen = new Set(out.map((c) => c.aliexpress_id));
  for (const a of archive) {
    if (seen.has(a.aliexpress_id)) continue;
    seen.add(a.aliexpress_id);
    out.push(a);
  }
  return out;
}

/** Liste à afficher selon le filtre et la catégorie, avec des compteurs qui correspondent à ce qu'on voit. */
export function buildTrendViews(candidates: TrendCandidate[], archive: TrendCandidate[], filter: TrendFilter, category = 'all'): TrendViews {
  const refused = refusedList(candidates, archive);
  const pending = candidates.filter((c) => c.decision === 'pending');
  const yes = candidates.filter((c) => c.decision === 'yes');
  const base = filter === 'no' ? refused : filter === 'pending' ? pending : filter === 'yes' ? yes : candidates.filter((c) => c.decision !== 'no');
  return {
    list: category === 'all' ? base : base.filter((c) => c.category_slug === category),
    counts: { active: pending.length + yes.length, pending: pending.length, yes: yes.length, no: refused.length },
  };
}

/**
 * Une décision peut-elle encore être changée ?
 *  - « locked » : fiche en cours de création ou déjà en ligne (le serveur ignore tout changement) ;
 *  - « confirm » : fiche prête avant sa mise en ligne automatique (annulable, mais à confirmer) ;
 *  - « free » : libre.
 */
export function trendLockState(c: Pick<TrendCandidate, 'decision' | 'status'>): 'free' | 'confirm' | 'locked' {
  if (c.decision !== 'yes') return 'free';
  if (c.status === 'in_progress' || c.status === 'live') return 'locked';
  if (c.status === 'ready') return 'confirm';
  return 'free';
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation : choix de la semaine, puis catégories (même présentation que la page Produits)
// ─────────────────────────────────────────────────────────────────────────────

/** Icônes de secours (les mêmes que la table « categories » de la page Produits, qui reste prioritaire). */
export const TREND_CATEGORY_ICONS: Record<string, string> = {
  tech: '💻',
  'mode-beaute': '💄',
  'maison-deco': '🏠',
  'sport-bien-etre': '🏋️',
  'art-design': '🎨',
  loisirs: '🎯',
  'jeux-jouets': '🧸',
  puericulture: '🍼',
};

export interface TrendWeek {
  week: string;
  total: number;
  pending: number;
  yes: number;
}

/** Semaines disponibles (la plus récente d'abord), avec leurs compteurs. Les refusés ne comptent pas dans « total ». */
export function summarizeWeeks(rows: { week: string; decision: TrendDecision }[]): TrendWeek[] {
  const map = new Map<string, TrendWeek>();
  for (const r of rows) {
    const w = map.get(r.week) ?? { week: r.week, total: 0, pending: 0, yes: 0 };
    if (r.decision !== 'no') w.total++;
    if (r.decision === 'pending') w.pending++;
    if (r.decision === 'yes') w.yes++;
    map.set(r.week, w);
  }
  return Array.from(map.values()).sort((a, b) => (a.week < b.week ? 1 : a.week > b.week ? -1 : 0));
}

export interface TrendCategoryStat {
  slug: string;
  label: string;
  icon: string;
  total: number;
  pending: number;
  yes: number;
  live: number;
}

/** Une carte par catégorie pour la semaine affichée (les produits refusés sont comptés à part). */
export function categoryStats(candidates: TrendCandidate[], icons: Record<string, string> = {}): TrendCategoryStat[] {
  return TREND_CATEGORIES.map((cat) => {
    const mine = candidates.filter((c) => c.category_slug === cat.slug && c.decision !== 'no');
    return {
      slug: cat.slug,
      label: cat.label,
      icon: icons[cat.slug] || TREND_CATEGORY_ICONS[cat.slug] || '📁',
      total: mine.length,
      pending: mine.filter((c) => c.decision === 'pending').length,
      yes: mine.filter((c) => c.decision === 'yes').length,
      live: mine.filter((c) => c.decision === 'yes' && c.status === 'live').length,
    };
  });
}
