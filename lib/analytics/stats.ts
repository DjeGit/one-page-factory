/**
 * Lectures statistiques de l'admin et des pages publiques, en UN aller-retour quand la migration
 * 20261104000001_analytics_functions.sql est appliquée (fonctions SQL « opf_* » appelées via rpc),
 * avec repli automatique sur l'ancienne méthode (plusieurs requêtes) tant qu'elle ne l'est pas.
 *
 * Aucun accès à lib/supabase.ts ici (le client est reçu en paramètre) : le module reste testable et sans cycle d'import.
 *
 * Historique : getAnalytics / computeMarketROI faisaient 2 requêtes PAR produit (4-5 s, corrigé le 19/10 par des lots
 * parallèles, lib/analytics/counts.ts) ; getDashboardStats envoyait la liste de tous les ids de produits dans l'URL de
 * quatre requêtes (limite de longueur d'URL dépassée à partir de quelques centaines de produits).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DashboardStats } from '@/types';
import type { Market } from '@/lib/market';
import { countsByProduct } from '@/lib/analytics/counts';

type Db = Pick<SupabaseClient, 'rpc' | 'from'>;

// ---------------------------------------------------------------------------
// Appel de fonction SQL avec mémoire « la fonction n'existe pas encore »
// ---------------------------------------------------------------------------

const RPC_RETRY_AFTER_MS = 5 * 60_000;
const rpcMissingUntil = new Map<string, number>();

interface RpcErrorLike {
  code?: string;
  message?: string;
}

/** Vrai si l'erreur signifie « cette fonction SQL n'existe pas (encore) » : migration pas appliquée. */
export function isMissingFunctionError(error: RpcErrorLike | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST202' || // PostgREST : fonction introuvable dans le schéma
    error.code === '42883' || // Postgres : undefined_function
    /could not find the function|function .* does not exist/i.test(error.message ?? '')
  );
}

/** À n'utiliser que dans les tests. */
export function resetRpcState(): void {
  rpcMissingUntil.clear();
}

export async function tryRpc<T>(
  sb: Pick<SupabaseClient, 'rpc'>,
  name: string,
  args: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false }> {
  const until = rpcMissingUntil.get(name);
  if (until !== undefined && until > Date.now()) return { ok: false };

  const { data, error } = await sb.rpc(name, args);
  if (error) {
    if (isMissingFunctionError(error)) {
      rpcMissingUntil.set(name, Date.now() + RPC_RETRY_AFTER_MS);
      console.warn(`[stats] fonction SQL ${name} absente : appliquer la migration 20261104000001_analytics_functions.sql (repli sur l'ancienne méthode, plus lente).`);
    } else {
      console.error(`[stats] ${name} a échoué, repli sur l'ancienne méthode :`, error.message ?? error);
    }
    return { ok: false };
  }
  rpcMissingUntil.delete(name);
  return { ok: true, data: data as T };
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ---------------------------------------------------------------------------
// Tableau de bord : compteurs d'un marché
// ---------------------------------------------------------------------------

/** Taille des lots d'ids envoyés dans une URL (36 caractères par id : 100 ids ≈ 3,7 Ko, très en dessous des limites). */
export const ID_CHUNK = 100;

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const EMPTY_DASHBOARD: DashboardStats = {
  total_products: 0,
  active_products: 0,
  clicks_today: 0,
  views_today: 0,
  total_clicks: 0,
  total_views: 0,
};

export async function loadDashboardStats(sb: Db, market: Market, sinceIso: string): Promise<DashboardStats> {
  const viaRpc = await tryRpc<Record<string, unknown>[]>(sb, 'opf_dashboard_stats', { p_market: market, p_since: sinceIso });
  if (viaRpc.ok) {
    const row = Array.isArray(viaRpc.data) ? viaRpc.data[0] : (viaRpc.data as unknown as Record<string, unknown> | null);
    if (!row) return { ...EMPTY_DASHBOARD };
    return {
      total_products: num(row.total_products),
      active_products: num(row.active_products),
      clicks_today: num(row.clicks_today),
      views_today: num(row.views_today),
      total_clicks: num(row.total_clicks),
      total_views: num(row.total_views),
    };
  }
  return loadDashboardStatsLegacy(sb, market, sinceIso);
}

/** Ancienne méthode (avant migration) : ids du marché, puis comptages par lots d'ids. */
async function loadDashboardStatsLegacy(sb: Db, market: Market, sinceIso: string): Promise<DashboardStats> {
  const { data: marketProducts, error } = await sb.from('products').select('id, active').eq('market', market);
  if (error) console.error('[stats] lecture des produits du marché impossible :', error.message);

  const productIds = (marketProducts || []).map((p) => p.id as string);
  const activeCount = (marketProducts || []).filter((p) => p.active).length;
  if (productIds.length === 0) return { ...EMPTY_DASHBOARD };

  const sumCounts = async (table: 'clicks' | 'page_views', dateColumn: string | null): Promise<number> => {
    const parts = await Promise.all(
      chunk(productIds, ID_CHUNK).map(async (ids) => {
        let q = sb.from(table).select('*', { count: 'exact', head: true }).in('product_id', ids);
        if (dateColumn) q = q.gte(dateColumn, sinceIso);
        const { count, error: e } = await q;
        if (e) console.error(`[stats] comptage ${table} impossible :`, e.message);
        return count || 0;
      }),
    );
    return parts.reduce((a, b) => a + b, 0);
  };

  const [clicksToday, viewsToday, totalClicks, totalViews] = await Promise.all([
    sumCounts('clicks', 'clicked_at'),
    sumCounts('page_views', 'viewed_at'),
    sumCounts('clicks', null),
    sumCounts('page_views', null),
  ]);

  return {
    total_products: productIds.length,
    active_products: activeCount,
    clicks_today: clicksToday,
    views_today: viewsToday,
    total_clicks: totalClicks,
    total_views: totalViews,
  };
}

// ---------------------------------------------------------------------------
// Clics / vues par produit
// ---------------------------------------------------------------------------

export interface ProductCountRow {
  product_id: string;
  name: string;
  slug: string;
  price: number | null;
  clicks: number;
  views: number;
  /** Clics / vues depuis `since` (0 si `since` n'est pas fourni). */
  clicks_since: number;
  views_since: number;
}

export interface ProductCountsOptions {
  market?: Market;
  productId?: string;
  since?: string;
  /** Vrai = on n'a pas besoin des vues (économise N requêtes dans le repli sans migration). */
  skipViews?: boolean;
}

export async function loadProductCounts(sb: Db, opts: ProductCountsOptions = {}): Promise<ProductCountRow[]> {
  const viaRpc = await tryRpc<Record<string, unknown>[]>(sb, 'opf_product_counts', {
    p_market: opts.market ?? null,
    p_product_id: opts.productId ?? null,
    p_since: opts.since ?? null,
  });
  if (viaRpc.ok) {
    return (viaRpc.data || []).map((r) => ({
      product_id: String(r.product_id),
      name: String(r.name ?? ''),
      slug: String(r.slug ?? ''),
      price: r.price == null ? null : num(r.price),
      clicks: num(r.clicks),
      views: num(r.views),
      clicks_since: num(r.clicks_since),
      views_since: num(r.views_since),
    }));
  }
  return loadProductCountsLegacy(sb, opts);
}

/** Ancienne méthode : une requête de comptage par produit (en parallèle, par lots de 16). */
async function loadProductCountsLegacy(sb: Db, opts: ProductCountsOptions): Promise<ProductCountRow[]> {
  let q = sb.from('products').select('id, name, slug, price');
  if (opts.market) q = q.eq('market', opts.market);
  if (opts.productId) q = q.eq('id', opts.productId);
  const { data: products, error } = await q;
  if (error) console.error('[stats] lecture des produits impossible :', error.message);
  if (!products) return [];

  const ids = products.map((p) => p.id as string);
  const dateColumn = { clicks: 'clicked_at', page_views: 'viewed_at' } as const;
  const countOne = (since?: string) => (table: 'clicks' | 'page_views', id: string) => {
    let c = sb.from(table).select('*', { count: 'exact', head: true }).eq('product_id', id);
    if (since) c = c.gte(dateColumn[table], since);
    return c;
  };

  const [clicks, views, clicksSince, viewsSince] = await Promise.all([
    countsByProduct(countOne(), 'clicks', ids),
    opts.skipViews ? Promise.resolve(new Map<string, number>()) : countsByProduct(countOne(), 'page_views', ids),
    opts.since ? countsByProduct(countOne(opts.since), 'clicks', ids) : Promise.resolve(new Map<string, number>()),
    opts.since && !opts.skipViews ? countsByProduct(countOne(opts.since), 'page_views', ids) : Promise.resolve(new Map<string, number>()),
  ]);

  return products.map((p) => {
    const id = p.id as string;
    return {
      product_id: id,
      name: p.name as string,
      slug: p.slug as string,
      price: p.price == null ? null : Number(p.price),
      clicks: clicks.get(id) ?? 0,
      views: views.get(id) ?? 0,
      clicks_since: clicksSince.get(id) ?? 0,
      views_since: viewsSince.get(id) ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Produits en ligne par catégorie et par marché
// ---------------------------------------------------------------------------

export type CategoryCounts = Record<string, Record<Market, number>>;

export interface CategoryCountRow {
  category_id: string | null;
  market: string;
  n: number;
}

/** Transforme des lignes (catégorie, marché, nombre) en { [categoryId]: { fr, es, uk } }. */
export function aggregateCategoryCounts(rows: CategoryCountRow[]): CategoryCounts {
  const out: CategoryCounts = {};
  for (const r of rows) {
    if (!r.category_id) continue;
    if (r.market !== 'fr' && r.market !== 'es' && r.market !== 'uk') continue;
    const entry = (out[r.category_id] ||= { fr: 0, es: 0, uk: 0 });
    entry[r.market] += r.n;
  }
  return out;
}

const CATEGORY_PAGE = 1000;

/**
 * Lève une erreur en cas de panne (au lieu de renvoyer un résultat partiel) : la visibilité des catégories est
 * automatique, un comptage tronqué ferait disparaître des catégories du site. ttlCache ressert alors la dernière
 * valeur connue.
 */
export async function loadCategoryCounts(sb: Db): Promise<CategoryCounts> {
  const viaRpc = await tryRpc<{ category_id: string | null; market: string; n: unknown }[]>(sb, 'opf_category_product_counts', {});
  if (viaRpc.ok) {
    return aggregateCategoryCounts((viaRpc.data || []).map((r) => ({ category_id: r.category_id, market: r.market, n: num(r.n) })));
  }

  const rows: CategoryCountRow[] = [];
  for (let from = 0; ; from += CATEGORY_PAGE) {
    const { data, error } = await sb
      .from('products')
      .select('category_id, market')
      .eq('active', true)
      .not('category_id', 'is', null)
      .order('id', { ascending: true }) // ordre stable obligatoire : sans lui, une pagination par range peut sauter ou répéter des lignes
      .range(from, from + CATEGORY_PAGE - 1);
    if (error) throw new Error(`comptage des produits par catégorie impossible : ${error.message}`);
    const page = (data || []) as { category_id: string | null; market: string }[];
    for (const r of page) rows.push({ category_id: r.category_id, market: r.market, n: 1 });
    if (page.length < CATEGORY_PAGE) break;
  }
  return aggregateCategoryCounts(rows);
}
