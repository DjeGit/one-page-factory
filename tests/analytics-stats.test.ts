import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  aggregateCategoryCounts,
  isMissingFunctionError,
  loadCategoryCounts,
  loadDashboardStats,
  loadProductCounts,
  resetRpcState,
} from '../lib/analytics/stats';

type Result = { data?: unknown; count?: number | null; error?: unknown };

/** Faux client Supabase : `rpc` et `from(table)` répondent selon des tables de réponses ; chaque appel est enregistré. */
function fakeClient(opts: {
  rpc?: Record<string, Result>;
  from?: (table: string, calls: [string, unknown[]][]) => Result;
}) {
  const log: { rpc: string[]; from: { table: string; calls: [string, unknown[]][] }[] } = { rpc: [], from: [] };
  const client = {
    rpc: vi.fn(async (name: string) => {
      log.rpc.push(name);
      const r = opts.rpc?.[name];
      return r ? { data: r.data ?? null, error: r.error ?? null } : { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } };
    }),
    from: vi.fn((table: string) => {
      const entry = { table, calls: [] as [string, unknown[]][] };
      log.from.push(entry);
      const builder: any = new Proxy(
        {},
        {
          get(_t, prop: string) {
            if (prop === 'then') {
              const res = opts.from?.(table, entry.calls) ?? {};
              return (resolve: (v: unknown) => unknown) => resolve({ data: res.data ?? null, count: res.count ?? null, error: res.error ?? null });
            }
            return (...args: unknown[]) => {
              entry.calls.push([prop, args]);
              return builder;
            };
          },
        },
      );
      return builder;
    }),
  };
  return { client: client as any, log };
}

describe('isMissingFunctionError', () => {
  it('reconnaît une fonction SQL absente, pas une autre erreur', () => {
    expect(isMissingFunctionError({ code: 'PGRST202' })).toBe(true);
    expect(isMissingFunctionError({ code: '42883' })).toBe(true);
    expect(isMissingFunctionError({ message: 'Could not find the function public.opf_x in the schema cache' })).toBe(true);
    expect(isMissingFunctionError({ code: '57014', message: 'statement timeout' })).toBe(false);
    expect(isMissingFunctionError(null)).toBe(false);
  });
});

describe('loadDashboardStats', () => {
  beforeEach(() => {
    resetRpcState();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('avec la migration : une seule requête, nombres convertis', async () => {
    const { client, log } = fakeClient({
      rpc: { opf_dashboard_stats: { data: [{ total_products: '5', active_products: 3, clicks_today: 2, views_today: 7, total_clicks: 40, total_views: 400 }] } },
    });
    const stats = await loadDashboardStats(client, 'fr', '2026-11-03T23:00:00.000Z');
    expect(stats).toEqual({ total_products: 5, active_products: 3, clicks_today: 2, views_today: 7, total_clicks: 40, total_views: 400 });
    expect(log.rpc).toEqual(['opf_dashboard_stats']);
    expect(log.from).toHaveLength(0);
    expect(client.rpc).toHaveBeenCalledWith('opf_dashboard_stats', { p_market: 'fr', p_since: '2026-11-03T23:00:00.000Z' });
  });

  it('sans la migration : repli, ids envoyés par lots de 100 (jamais une URL géante) et totaux additionnés', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => ({ id: `id${i}`, active: i % 2 === 0 }));
    const { client, log } = fakeClient({
      from: (table, calls) => {
        if (table === 'products') return { data: ids };
        const inCall = calls.find(([m]) => m === 'in');
        expect((inCall![1][1] as string[]).length).toBeLessThanOrEqual(100);
        return { count: 10 };
      },
    });
    const stats = await loadDashboardStats(client, 'es', 'x');
    expect(stats.total_products).toBe(250);
    expect(stats.active_products).toBe(125);
    expect(stats.total_clicks).toBe(30); // 3 lots × 10
    expect(stats.views_today).toBe(30);
    // 1 lecture de produits + 4 compteurs × 3 lots
    expect(log.from).toHaveLength(1 + 4 * 3);
  });

  it('après un premier échec « fonction absente », ne la redemande pas à chaque appel', async () => {
    const { client } = fakeClient({ from: () => ({ data: [] }) });
    await loadDashboardStats(client, 'fr', 'x');
    await loadDashboardStats(client, 'fr', 'x');
    expect(client.rpc).toHaveBeenCalledTimes(1);
  });

  it('marché sans produit : zéros', async () => {
    const { client } = fakeClient({ from: () => ({ data: [] }) });
    expect(await loadDashboardStats(client, 'uk', 'x')).toEqual({
      total_products: 0, active_products: 0, clicks_today: 0, views_today: 0, total_clicks: 0, total_views: 0,
    });
  });
});

describe('loadProductCounts', () => {
  beforeEach(() => {
    resetRpcState();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('avec la migration : une requête, avec les filtres transmis', async () => {
    const { client } = fakeClient({
      rpc: { opf_product_counts: { data: [{ product_id: 'p1', name: 'Montre', slug: 'montre', price: '19.9', clicks: 4, views: 40, clicks_since: 0, views_since: 0 }] } },
    });
    const rows = await loadProductCounts(client, { market: 'fr' });
    expect(rows).toEqual([{ product_id: 'p1', name: 'Montre', slug: 'montre', price: 19.9, clicks: 4, views: 40, clicks_since: 0, views_since: 0 }]);
    expect(client.rpc).toHaveBeenCalledWith('opf_product_counts', { p_market: 'fr', p_product_id: null, p_since: null });
  });

  it('sans la migration : repli par produit, avec la période demandée', async () => {
    const { client } = fakeClient({
      from: (table, calls) => {
        if (table === 'products') return { data: [{ id: 'p1', name: 'A', slug: 'a', price: 10 }, { id: 'p2', name: 'B', slug: 'b', price: null }] };
        const since = calls.some(([m]) => m === 'gte');
        return { count: table === 'clicks' ? (since ? 1 : 3) : since ? 5 : 9 };
      },
    });
    const rows = await loadProductCounts(client, { market: 'fr', since: '2026-11-01' });
    expect(rows).toEqual([
      { product_id: 'p1', name: 'A', slug: 'a', price: 10, clicks: 3, views: 9, clicks_since: 1, views_since: 5 },
      { product_id: 'p2', name: 'B', slug: 'b', price: null, clicks: 3, views: 9, clicks_since: 1, views_since: 5 },
    ]);
  });

  it('skipViews : le repli ne compte pas les vues', async () => {
    const { client, log } = fakeClient({
      from: (table) => (table === 'products' ? { data: [{ id: 'p1', name: 'A', slug: 'a', price: 1 }] } : { count: 2 }),
    });
    const rows = await loadProductCounts(client, { skipViews: true });
    expect(rows[0].clicks).toBe(2);
    expect(rows[0].views).toBe(0);
    expect(log.from.filter((f) => f.table === 'page_views')).toHaveLength(0);
  });
});

describe('catégories', () => {
  beforeEach(() => {
    resetRpcState();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('aggregateCategoryCounts : additionne par catégorie et marché, ignore marché inconnu et sans catégorie', () => {
    expect(
      aggregateCategoryCounts([
        { category_id: 'c1', market: 'fr', n: 2 },
        { category_id: 'c1', market: 'fr', n: 1 },
        { category_id: 'c1', market: 'uk', n: 4 },
        { category_id: null, market: 'fr', n: 9 },
        { category_id: 'c2', market: 'de', n: 9 },
      ]),
    ).toEqual({ c1: { fr: 3, es: 0, uk: 4 } });
  });

  it('avec la migration : une requête', async () => {
    const { client, log } = fakeClient({ rpc: { opf_category_product_counts: { data: [{ category_id: 'c1', market: 'es', n: '3' }] } } });
    expect(await loadCategoryCounts(client)).toEqual({ c1: { fr: 0, es: 3, uk: 0 } });
    expect(log.from).toHaveLength(0);
  });

  it('repli : pagine au-delà de 1000 lignes avec un tri stable', async () => {
    let page = 0;
    const { client, log } = fakeClient({
      from: () => {
        page += 1;
        return { data: Array.from({ length: page === 1 ? 1000 : 5 }, () => ({ category_id: 'c1', market: 'fr' })) };
      },
    });
    expect(await loadCategoryCounts(client)).toEqual({ c1: { fr: 1005, es: 0, uk: 0 } });
    expect(log.from).toHaveLength(2);
    expect(log.from[0].calls.some(([m, a]) => m === 'order' && a[0] === 'id')).toBe(true);
    expect(log.from[1].calls.find(([m]) => m === 'range')![1]).toEqual([1000, 1999]);
  });

  it('repli : une panne lève une erreur au lieu de renvoyer un comptage partiel', async () => {
    const { client } = fakeClient({ from: () => ({ error: { message: 'timeout' } }) });
    await expect(loadCategoryCounts(client)).rejects.toThrow(/timeout/);
  });
});
