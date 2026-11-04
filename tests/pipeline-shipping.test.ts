import { describe, it, expect } from 'vitest';
// @ts-ignore — module Node pur (.mjs)
import { parseEntry, listShipping, formatList, applyShipping } from '../scripts/pipeline/shipping.mjs';

// Faux client Supabase minimal en mémoire
function fakeDb(tables: Record<string, any[]>) {
  const from = (name: string) => {
    const st: any = { op: 'select', filters: [] as any[], patch: null, want: false, maybe: false, limit: null, orderBy: null };
    const b: any = {
      select() { st.want = true; return b; },
      update(p: any) { st.op = 'update'; st.patch = p; return b; },
      eq(c: string, v: any) { st.filters.push((r: any) => r[c] === v); return b; },
      order(c: string, o?: any) { st.orderBy = [c, o?.ascending === false ? -1 : 1]; return b; },
      limit(n: number) { st.limit = n; return b; },
      maybeSingle() { st.maybe = true; return b; },
      then(res: any, rej: any) {
        let hit = tables[name].filter((r) => st.filters.every((f: any) => f(r)));
        if (st.orderBy) hit = [...hit].sort((a, z) => (a[st.orderBy[0]] > z[st.orderBy[0]] ? 1 : -1) * st.orderBy[1]);
        let out: any;
        if (st.op === 'update') {
          hit.forEach((r) => Object.assign(r, st.patch));
          out = { data: st.want ? hit.map((r) => ({ id: r.id })) : null, error: null };
        } else {
          const rows = st.limit ? hit.slice(0, st.limit) : hit;
          out = { data: st.maybe ? rows[0] ?? null : rows, error: null };
        }
        return Promise.resolve(out).then(res, rej);
      },
    };
    return b;
  };
  return { from };
}

const cand = (over: any = {}) => ({
  id: 'c1', aliexpress_id: '1005007345056908', week: '2026-11-02', name: 'Pistolet de massage', decision: null, status: 'candidate',
  url_fr: null, url_uk: 'https://www.aliexpress.com/item/1005011111111111.html', price_uk: 20,
  free_shipping_fr: null, free_shipping_es: null, free_shipping_uk: null, created_at: '1', ...over,
});

describe('shipping : lecture des arguments', () => {
  it('parseEntry', () => {
    expect(parseEntry('1005007345056908=fr:1,es:0,uk:1')).toEqual({ id: '1005007345056908', values: { fr: true, es: false, uk: true } });
    expect(parseEntry('1005007345056908=FR:1, es:?')).toEqual({ id: '1005007345056908', values: { fr: true } });
  });
  it('parseEntry refuse les saisies douteuses', () => {
    expect(() => parseEntry('abc=fr:1')).toThrow(/illisible/);
    expect(() => parseEntry('1005007345056908=fr:oui')).toThrow(/illisible/);
    expect(() => parseEntry('1005007345056908=de:1')).toThrow(/illisible/);
    expect(() => parseEntry('1005007345056908=fr:?')).toThrow(/Aucune valeur/);
  });
});

describe('shipping : liste', () => {
  it('prend la dernière semaine, une page par pays, l’annonce UK propre au marché', async () => {
    const sb = fakeDb({ trend_candidates: [cand({ id: 'old', week: '2026-10-26' }), cand({ free_shipping_es: 'Oui' })], products: [] });
    const res = await listShipping(sb);
    expect(res.week).toBe('2026-11-02');
    expect(res.rows).toHaveLength(1);
    const m = Object.fromEntries(res.rows[0].markets.map((x: any) => [x.market, x]));
    expect(m.fr.url).toBe('https://www.aliexpress.com/item/1005007345056908.html');
    expect(m.uk.itemId).toBe('1005011111111111');
    expect(m.es.current).toBe('Oui');
    expect(m.fr.current).toBeNull();
    expect(formatList(res)).toContain('1005007345056908=fr:?,es:?,uk:?');
  });
  it('saute le UK quand aucune annonce UK n’a été repérée, et --missing masque les produits complets', async () => {
    const sb = fakeDb({ trend_candidates: [
      cand({ url_uk: null, price_uk: null }),
      cand({ id: 'c2', created_at: '2', aliexpress_id: '1005000000000002', free_shipping_fr: 'Oui', free_shipping_es: 'Non', free_shipping_uk: 'Non' }),
    ], products: [] });
    const all = await listShipping(sb);
    expect(all.rows[0].markets.map((x: any) => x.market)).toEqual(['fr', 'es']);
    const missing = await listShipping(sb, { missingOnly: true });
    expect(missing.rows.map((r: any) => r.aliexpressId)).toEqual(['1005007345056908']);
  });
  it('rien en base', async () => {
    const res = await listShipping(fakeDb({ trend_candidates: [], products: [] }));
    expect(formatList(res)).toMatch(/Aucune semaine/);
  });
});

describe('shipping : enregistrement', () => {
  const setup = () => {
    const t = {
      trend_candidates: [cand({ free_shipping_fr: 'Non' })],
      products: [
        { id: 'p-fr', aliexpress_id: '1005007345056908', market: 'fr', free_shipping: false },
        { id: 'p-es', aliexpress_id: '1005007345056908', market: 'es', free_shipping: false },
        { id: 'p-uk', aliexpress_id: '1005011111111111', market: 'uk', free_shipping: true },
        { id: 'other', aliexpress_id: '999999999', market: 'fr', free_shipping: false },
      ],
    };
    return { t, sb: fakeDb(t) };
  };

  it('écrit Oui/Non pour la page Tendance et met à jour les fiches du bon marché', async () => {
    const { t, sb } = setup();
    const logs: string[] = [];
    const rep = await applyShipping(sb, [{ id: '1005007345056908', values: { fr: true, es: true, uk: false } }], { log: (m: string) => logs.push(m) });
    expect(t.trend_candidates[0]).toMatchObject({ free_shipping_fr: 'Oui', free_shipping_es: 'Oui', free_shipping_uk: 'Non' });
    expect(t.products.map((p) => p.free_shipping)).toEqual([true, true, false, false]);
    expect(rep).toEqual([{ id: '1005007345056908', found: true, candidates: 1, products: 3 }]);
    expect(logs[0]).toContain('FR Oui');
  });

  it('ne touche pas les marchés non relevés ni les autres produits', async () => {
    const { t, sb } = setup();
    await applyShipping(sb, [{ id: '1005007345056908', values: { es: true } }]);
    expect(t.trend_candidates[0].free_shipping_fr).toBe('Non');
    expect(t.trend_candidates[0].free_shipping_es).toBe('Oui');
    expect(t.products.find((p) => p.id === 'p-fr')!.free_shipping).toBe(false);
    expect(t.products.find((p) => p.id === 'other')!.free_shipping).toBe(false);
  });

  it('--candidates-only laisse les fiches intactes ; produit inconnu signalé', async () => {
    const { t, sb } = setup();
    const rep = await applyShipping(sb, [{ id: '1005007345056908', values: { fr: true } }, { id: '1234567890', values: { fr: true } }], { updateProducts: false });
    expect(t.products.find((p) => p.id === 'p-fr')!.free_shipping).toBe(false);
    expect(rep[1]).toMatchObject({ found: false });
  });
});

describe('shipping : cas limites', () => {
  it('plusieurs semaines : l’annonce UK de la semaine la plus récente fait foi pour les fiches', async () => {
    const t = {
      trend_candidates: [
        cand({ id: 'old', week: '2026-10-26', url_uk: 'https://www.aliexpress.com/item/1005088888888888.html' }),
        cand({ id: 'new', week: '2026-11-02' }),
      ],
      products: [
        { id: 'p-uk-old', aliexpress_id: '1005088888888888', market: 'uk', free_shipping: false },
        { id: 'p-uk-new', aliexpress_id: '1005011111111111', market: 'uk', free_shipping: false },
      ],
    };
    const rep = await applyShipping(fakeDb(t), [{ id: '1005007345056908', values: { uk: true } }]);
    expect(rep[0]).toMatchObject({ candidates: 2, products: 1 });
    expect(t.products.map((p) => p.free_shipping)).toEqual([false, true]);
    expect(t.trend_candidates.every((c: any) => c.free_shipping_uk === 'Oui')).toBe(true);
  });

  it('relancer la même commande ne change rien de plus (idempotent)', async () => {
    const t = { trend_candidates: [cand()], products: [{ id: 'p', aliexpress_id: '1005007345056908', market: 'fr', free_shipping: false }] };
    const entries = [{ id: '1005007345056908', values: { fr: true } }];
    await applyShipping(fakeDb(t), entries);
    const once = JSON.stringify(t.products);
    await applyShipping(fakeDb(t), entries);
    expect(JSON.stringify(t.products)).toBe(once);
  });

  it('la liste rappelle de choisir le pays de livraison sur la page', async () => {
    const res = await listShipping(fakeDb({ trend_candidates: [cand()], products: [] }));
    expect(formatList(res)).toContain('pays de livraison');
  });
});
