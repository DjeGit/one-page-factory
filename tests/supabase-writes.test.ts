import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type Op = { table: string; method: string; args: unknown[]; chain: [string, unknown[]][] };
const state = vi.hoisted(() => ({
  ops: [] as Op[],
  /** Réponse programmée : reçoit l'opération, renvoie { data, error }. */
  respond: ((_op: Op) => ({ data: null, error: null })) as (op: Op) => { data?: unknown; error?: unknown },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: async () => ({ data: null, error: null }),
    from: (table: string) => {
      const op: Op = { table, method: 'select', args: [], chain: [] };
      const builder: any = new Proxy(
        {},
        {
          get(_t, prop: string) {
            if (prop === 'then') {
              state.ops.push(op);
              const r = state.respond(op);
              return (resolve: (v: unknown) => unknown) => resolve({ data: r.data ?? null, error: r.error ?? null });
            }
            return (...args: unknown[]) => {
              if (['select', 'insert', 'update', 'delete', 'upsert'].includes(prop) && op.chain.length === 0 && op.method === 'select' && prop !== 'select') {
                op.method = prop;
                op.args = args;
              }
              op.chain.push([prop, args]);
              return builder;
            };
          },
        },
      );
      return builder;
    },
  }),
}));

import { createProduct, deleteProduct, getProduct, trackPageView, trackClick, updateProduct } from '../lib/supabase';
import { ttlCache } from '../lib/ttl-cache';

const req = (headers: Record<string, string> = { 'x-forwarded-for': '198.51.100.4', 'user-agent': 'Mozilla/5.0 Firefox' }) => ({ headers: new Headers(headers) }) as any;

describe('lib/supabase — écritures et lectures', () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';
    state.ops = [];
    state.respond = () => ({ data: null, error: null });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('getProduct : introuvable = null ; vraie panne = erreur (pas un faux 404)', async () => {
    state.respond = () => ({ data: null, error: null });
    expect(await getProduct('absent')).toBeNull();
    state.respond = () => ({ data: null, error: { code: '08006', message: 'connection failure' } });
    await expect(getProduct('x')).rejects.toThrow(/connection failure/);
  });

  it('createProduct : une fiche sans consigne « active » est créée hors ligne', async () => {
    state.respond = (op) => (op.method === 'insert' ? { data: { id: 'p1' } } : { data: null });
    await createProduct({ market: 'fr', name: 'Montre test', affiliate_url: 'https://x' });
    const insert = state.ops.find((o) => o.method === 'insert')!;
    expect((insert.args[0] as any).active).toBe(false);
    expect((insert.args[0] as any).slug).toBe('montre-test');
  });

  it('createProduct : slug déjà pris au moment de l\'insertion -> une seconde tentative avec suffixe', async () => {
    let inserts = 0;
    state.respond = (op) => {
      if (op.method !== 'insert') return { data: null };
      inserts += 1;
      return inserts === 1
        ? { error: { code: '23505', message: 'duplicate key value violates unique constraint "products_slug_key"' } }
        : { data: { id: 'p2' } };
    };
    const product = await createProduct({ market: 'fr', name: 'Montre test', affiliate_url: 'https://x', active: true });
    expect(product).toEqual({ id: 'p2' });
    const slugs = state.ops.filter((o) => o.method === 'insert').map((o) => (o.args[0] as any).slug);
    expect(slugs[0]).toBe('montre-test');
    expect(slugs[1]).toMatch(/^montre-test-\d+$/);
  });

  it('updateProduct : n\'envoie ni id ni jointure category, et vide le cache public', async () => {
    let loads = 0;
    await ttlCache('categories:all', 60_000, async () => ++loads);
    state.respond = () => ({ data: { id: 'p1' } });
    await updateProduct('p1', { name: 'N', category: { id: 'c' } } as any);
    const update = state.ops.find((o) => o.method === 'update')!;
    expect(update.args[0]).toEqual({ name: 'N' });
    await ttlCache('categories:all', 60_000, async () => ++loads);
    expect(loads).toBe(2); // rechargé : le cache avait été vidé par l'écriture
  });

  it('deleteProduct : une racine avec des fiches liées passe le relais avant d\'être supprimée', async () => {
    state.respond = (op) => (op.table === 'products' && op.method === 'select' ? { data: [{ id: 'es1' }, { id: 'uk1' }] } : { data: null });
    expect(await deleteProduct('fr1')).toBe(true);
    const writes = state.ops.filter((o) => o.method !== 'select');
    expect(writes.map((o) => o.method)).toEqual(['update', 'update', 'delete']);
    expect(writes[0].args[0]).toEqual({ source_product_ref: null }); // es1 devient racine
    expect(writes[1].args[0]).toEqual({ source_product_ref: 'es1' }); // uk1 s'y rattache
  });

  it('deleteProduct : fiche sans fiche liée -> simple suppression', async () => {
    state.respond = () => ({ data: [] });
    expect(await deleteProduct('x')).toBe(true);
    expect(state.ops.filter((o) => o.method !== 'select').map((o) => o.method)).toEqual(['delete']);
  });

  it('deleteProduct : si le relais échoue, on ne supprime rien', async () => {
    state.respond = (op) => (op.method === 'select' ? { data: [{ id: 'es1' }] } : { error: { message: 'boom' } });
    expect(await deleteProduct('fr1')).toBe(false);
    expect(state.ops.some((o) => o.method === 'delete')).toBe(false);
  });

  it('trackPageView : index de déduplication absent -> la vue est quand même enregistrée (et signalée)', async () => {
    state.respond = (op) => (op.method === 'upsert' ? { error: { code: '42P10', message: 'no unique constraint' } } : { data: null });
    await trackPageView('p1', req());
    expect(state.ops.map((o) => o.method)).toEqual(['upsert', 'insert']);
  });

  it('trackPageView : IP inconnue -> pas de hash partagé (ip_hash null)', async () => {
    await trackPageView('p1', req({ 'user-agent': 'Mozilla/5.0 Firefox' }));
    const row = state.ops.find((o) => o.method === 'upsert')!.args[0] as any;
    expect(row.ip_hash).toBeNull();
  });

  it('trackPageView / trackClick : les robots ne sont pas comptés', async () => {
    await trackPageView('p1', req({ 'x-forwarded-for': '1.1.1.1', 'user-agent': 'Googlebot/2.1' }));
    await trackClick('p1', req({ 'x-forwarded-for': '1.1.1.1', 'user-agent': 'Googlebot/2.1' }));
    expect(state.ops).toHaveLength(0);
  });

  it('trackClick : un double-clic rapproché ne compte qu\'une fois', async () => {
    await trackClick('p-dbl', req({ 'x-forwarded-for': '203.0.113.50', 'user-agent': 'Mozilla/5.0 Firefox' }));
    await trackClick('p-dbl', req({ 'x-forwarded-for': '203.0.113.50', 'user-agent': 'Mozilla/5.0 Firefox' }));
    await trackClick('p-dbl', req({ 'x-forwarded-for': '203.0.113.51', 'user-agent': 'Mozilla/5.0 Firefox' }));
    expect(state.ops.filter((o) => o.table === 'clicks' && o.method === 'insert')).toHaveLength(2);
  });
});
