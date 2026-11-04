/**
 * Règles d'auto-optimisation (pause des produits qui convertissent mal), partagées par
 * /api/auto-optimize et par l'orchestrateur /api/pipeline/run : l'orchestrateur appelait
 * auparavant la route par une requête HTTP vers son propre site (domaine public, Cloudflare,
 * second contrôle d'accès, JSON non vérifié) ; il appelle maintenant directement ce code.
 */
import { getSupabaseAdmin } from '@/lib/supabase';
import { countsByProduct } from '@/lib/analytics/counts';
import { isValidMarket } from '@/lib/market';
import type { JsonBody } from './http';

export interface OptimizeParams {
  dryRun: boolean;
  minViews: number;
  pauseThreshold: number;
  scaleThreshold: number;
  market?: string;
}

export const DEFAULT_MIN_VIEWS = 500;

export interface OptimizeResult {
  status: number;
  body: Record<string, unknown>;
}

function num(v: unknown, fallback: number, min: number, max: number): number | null {
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) return null;
  return v;
}

/** Valide les paramètres reçus (corps JSON) ; renvoie les paramètres ou un message d'erreur français. */
export function parseOptimizeParams(body: JsonBody): { params: OptimizeParams } | { error: string } {
  if (body.dry_run !== undefined && typeof body.dry_run !== 'boolean') return { error: 'dry_run doit être un booléen' };
  const minViews = num(body.min_views, DEFAULT_MIN_VIEWS, 1, 1_000_000);
  const pauseThreshold = num(body.pause_threshold, 0.5, 0, 100); // %
  const scaleThreshold = num(body.scale_threshold, 5.0, 0, 100); // %
  if (minViews === null || pauseThreshold === null || scaleThreshold === null) {
    return { error: 'Paramètres invalides (min_views, pause_threshold, scale_threshold)' };
  }
  if (body.market !== undefined && (typeof body.market !== 'string' || !isValidMarket(body.market))) {
    return { error: 'Marché invalide (fr, es ou uk)' };
  }
  return {
    params: {
      dryRun: body.dry_run ?? false,
      minViews,
      pauseThreshold,
      scaleThreshold,
      market: body.market as string | undefined,
    },
  };
}

export async function runAutoOptimize(p: OptimizeParams): Promise<OptimizeResult> {
  const sb = getSupabaseAdmin();

  let productsQuery = sb.from('products').select('id, name, slug, active').eq('active', true);
  if (p.market) productsQuery = productsQuery.eq('market', p.market);
  const { data: products, error } = await productsQuery;
  if (error) {
    console.error('[api] auto-optimize (produits) :', error.message);
    return { status: 500, body: { error: 'Erreur serveur' } };
  }

  if (!products?.length) {
    return { status: 200, body: { message: 'No active products', actions: [] } };
  }

  // Comptages par lots en parallèle (avant : deux requêtes par produit, l'une après l'autre).
  const ids = products.map((x) => x.id as string);
  const countOne = (table: 'clicks' | 'page_views', id: string) =>
    sb.from(table).select('*', { count: 'exact', head: true }).eq('product_id', id);
  const [viewCounts, clickCounts] = await Promise.all([
    countsByProduct(countOne, 'page_views', ids),
    countsByProduct(countOne, 'clicks', ids),
  ]);

  const actions: Array<{
    product_id: string;
    name: string;
    slug: string;
    views: number;
    clicks: number;
    ctr: number;
    action: 'pause' | 'scale_flag' | 'ok';
    applied: boolean;
  }> = [];

  for (const prod of products) {
    const v = viewCounts.get(prod.id as string) ?? 0;
    const c = clickCounts.get(prod.id as string) ?? 0;
    if (v < p.minViews) continue; // pas assez de données

    const ctr = v > 0 ? (c / v) * 100 : 0;
    const base = { product_id: prod.id as string, name: prod.name as string, slug: prod.slug as string, views: v, clicks: c, ctr: Math.round(ctr * 100) / 100 };

    if (ctr < p.pauseThreshold) {
      actions.push({ ...base, action: 'pause', applied: false });
    } else if (ctr >= p.scaleThreshold) {
      actions.push({ ...base, action: 'scale_flag', applied: false });
    } else {
      actions.push({ ...base, action: 'ok', applied: false });
    }
  }

  const paused = actions.filter((a) => a.action === 'pause');
  const toScale = actions.filter((a) => a.action === 'scale_flag');
  const ok = actions.filter((a) => a.action === 'ok');

  // Pause en une seule requête (avant : une mise à jour par produit, sans contrôle du résultat).
  if (!p.dryRun && paused.length > 0) {
    const { error: pauseError } = await sb.from('products').update({ active: false }).in('id', paused.map((a) => a.product_id));
    if (pauseError) {
      console.error('[api] auto-optimize (pause) :', pauseError.message);
      return { status: 500, body: { error: 'Erreur serveur : la mise en pause a échoué' } };
    }
    paused.forEach((a) => { a.applied = true; });
  }

  return {
    status: 200,
    body: {
      dry_run: p.dryRun,
      analyzed: actions.length,
      paused: paused.length,
      scale_flagged: toScale.length,
      ok: ok.length,
      rules: { min_views: p.minViews, pause_threshold: `${p.pauseThreshold}%`, scale_threshold: `${p.scaleThreshold}%` },
      details: {
        paused,
        scale_flagged: toScale,
      },
    },
  };
}
