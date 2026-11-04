import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Faux client Supabase chaînable : enregistre les appels, renvoie les résultats programmés par table.
interface Call { table: string; ops: Array<[string, unknown[]]> }
const calls: Call[] = [];
const results: Record<string, { data: unknown; error: unknown; count?: number }[]> = {};

function from(table: string) {
  const call: Call = { table, ops: [] };
  calls.push(call);
  const chain: Record<string, unknown> = {};
  const next = () => (results[table]?.shift() ?? { data: [], error: null, count: 0 });
  const handler: ProxyHandler<object> = {
    get(_t, prop: string) {
      if (prop === 'then') {
        const r = next();
        return (res: (v: unknown) => unknown) => Promise.resolve(r).then(res);
      }
      return (...args: unknown[]) => {
        call.ops.push([prop, args]);
        return new Proxy(chain, handler);
      };
    },
  };
  return new Proxy(chain, handler);
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({ from }),
  generateSlug: (n: string) => n.toLowerCase().replace(/\s+/g, '-'),
}));
vi.mock('@/lib/ai', () => ({ generateProductContent: vi.fn() }));
vi.mock('@/lib/ttl-cache', () => ({ clearTtlCache: vi.fn() }));

import { POST } from '@/app/api/pipeline/run/route';

function req(body: unknown, auth = true) {
  return new NextRequest('http://localhost/api/pipeline/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: 'Bearer secret-pipeline' } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/pipeline/run', () => {
  beforeEach(() => {
    process.env.PIPELINE_SECRET = 'secret-pipeline';
    calls.length = 0;
    for (const k of Object.keys(results)) delete results[k];
  });

  it('refuse sans jeton (401)', async () => {
    expect((await POST(req({}, false))).status).toBe(401);
  });

  it('valide les paramètres (400)', async () => {
    expect((await POST(req('{oops'))).status).toBe(400);
    expect((await POST(req({ steps: ['detruire'] }))).status).toBe(400);
    expect((await POST(req({ steps: [] }))).status).toBe(400);
    expect((await POST(req({ max_products: 5000 }))).status).toBe(400);
    expect((await POST(req({ max_products: 'beaucoup' }))).status).toBe(400);
    expect((await POST(req({ market: 'com' }))).status).toBe(400);
    expect((await POST(req({ dry_run: 'oui' }))).status).toBe(400);
  });

  it('étape activate : ne vise que les fiches auto_discovered, et seulement celles prêtes et pas déjà jugées', async () => {
    results.products = [
      {
        data: [
          { id: 'p-pret', affiliate_url: 'https://www.amazon.fr/dp/B0', image_url: 'https://img/1.jpg', images: null },
          { id: 'p-sans-photo', affiliate_url: 'https://www.amazon.fr/dp/B1', image_url: null, images: [] },
          { id: 'p-deja-juge', affiliate_url: 'https://www.amazon.fr/dp/B2', image_url: 'https://img/2.jpg', images: null },
        ],
        error: null,
      },
      { data: null, error: null }, // update active:true
    ];
    // vues : p-pret 3, p-deja-juge 900 (>= 500 : déjà évalué par l'étape optimize)
    results.page_views = [
      { data: null, error: null, count: 3 },
      { data: null, error: null, count: 900 },
    ];

    const res = await POST(req({ steps: ['activate'] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.activate).toMatchObject({ activated: 1, not_ready: 1, already_judged: 1 });

    const select = calls.find((c) => c.table === 'products')!;
    expect(select.ops).toContainEqual(['eq', ['product_source', 'auto_discovered']]);
    expect(select.ops).toContainEqual(['eq', ['active', false]]);

    const update = calls.filter((c) => c.table === 'products')[1];
    expect(update.ops).toContainEqual(['in', ['id', ['p-pret']]]);
  });

  it('étape generate : ne lit que les fiches auto_discovered', async () => {
    results.products = [{ data: [], error: null }];
    const res = await POST(req({ steps: ['generate'] }));
    expect(res.status).toBe(200);
    expect(calls[0].ops).toContainEqual(['eq', ['product_source', 'auto_discovered']]);
  });

  it('une étape en échec donne un statut 207 et success=false (avant : toujours 200 « success »)', async () => {
    results.products = [{ data: null, error: { message: 'boom' } }];
    const res = await POST(req({ steps: ['activate'] }));
    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.failed_steps).toEqual(['activate']);
  });
});
