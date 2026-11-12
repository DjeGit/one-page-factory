import { describe, it, expect } from 'vitest';
// @ts-ignore — modules Node purs (.mjs)
import { parseProductQuery, searchProducts } from '../scripts/aliexpress/api.mjs';
// @ts-ignore
import { mondayOf, median, score, shortlist, buildRankPrompt, parseRanking, chooseProducts, buildRow, searchWeek, runSearch, loadExclusions, saveWeek, reportText, DEFAULTS, CATEGORY_QUERIES } from '../scripts/pipeline/trend-search.mjs';
// @ts-ignore
import { parseJsonLoose } from '../scripts/pipeline/fiche-text.mjs';
// @ts-ignore
import { renderEmail } from '../scripts/pipeline/notify.mjs';
// @ts-ignore
import { pickTargets, backfillVideos, statusText } from '../scripts/pipeline/video-backfill.mjs';
// @ts-ignore
import { cleanImageUrl, planImages, applyImages, reportText as imagesReport } from '../scripts/photos/set-images.mjs';
// @ts-ignore
import { runOnce } from '../scripts/pipeline/worker.mjs';

// ─── Faux client Supabase en mémoire (select / insert / update / delete, filtres courants) ───
function fakeDb(tables: Record<string, any[]>, opts: { failInsertOnce?: boolean } = {}) {
  let seq = 0;
  let failOnce = opts.failInsertOnce === true;
  const from = (name: string) => {
    const st: any = { op: 'select', filters: [] as ((r: any) => boolean)[], patch: null, row: null, head: false, single: false, maybe: false, limit: null };
    const b: any = {
      select(_c?: string, o?: any) { if (o?.head) st.head = true; return b; },
      insert(row: any) { st.op = 'insert'; st.row = row; return b; },
      update(p: any) { st.op = 'update'; st.patch = p; return b; },
      delete() { st.op = 'delete'; return b; },
      eq(c: string, v: any) { st.filters.push((r: any) => r[c] === v); return b; },
      neq(c: string, v: any) { st.filters.push((r: any) => r[c] !== v); return b; },
      in(c: string, vs: any[]) { st.filters.push((r: any) => vs.includes(r[c])); return b; },
      lt(c: string, v: any) { st.filters.push((r: any) => r[c] < v); return b; },
      like(c: string, pat: string) { const re = new RegExp('^' + pat.replace(/%/g, '.*') + '$'); st.filters.push((r: any) => re.test(r[c])); return b; },
      not(c: string, _op: string, v: any) { st.filters.push((r: any) => (v === null ? r[c] != null : r[c] !== v)); return b; },
      order() { return b; },
      limit(n: number) { st.limit = n; return b; },
      single() { st.single = true; return b; },
      maybeSingle() { st.maybe = true; return b; },
      then(res: any, rej: any) {
        const t = tables[name];
        const hit = t.filter((r) => st.filters.every((f: any) => f(r)));
        let out: any;
        if (st.op === 'insert') {
          if (failOnce && Array.isArray(st.row)) { failOnce = false; out = { data: null, error: { message: 'échec du lot' } }; }
          else {
            const rows = (Array.isArray(st.row) ? st.row : [st.row]).map((r: any) => ({ id: `id${++seq}`, decision: 'pending', status: 'candidate', ...r }));
            t.push(...rows);
            out = { data: Array.isArray(st.row) ? null : rows[0], error: null };
          }
        } else if (st.op === 'update') {
          hit.forEach((r) => Object.assign(r, st.patch));
          out = { data: hit.map((r) => ({ id: r.id })), error: null };
        } else if (st.op === 'delete') {
          for (const r of hit) t.splice(t.indexOf(r), 1);
          out = { count: hit.length, data: null, error: null };
        } else if (st.head) out = { count: hit.length, data: null, error: null };
        else {
          const rows = st.limit ? hit.slice(0, st.limit) : hit;
          out = st.single || st.maybe ? { data: rows[0] ?? null, error: null } : { data: rows, error: null };
        }
        return Promise.resolve(out).then(res, rej);
      },
    };
    return b;
  };
  return { from };
}

const item = (n: number, over: any = {}) => ({
  productId: String(1005000000000 + n), title: `Produit ${n} modèle X${n}00`, price: 40, currency: 'EUR', commissionRate: 0.07,
  rating: 4.7, sales: 1000, shopName: 'Boutique', productUrl: null, mainImage: `https://ae01.alicdn.com/kf/p${n}.jpg`, category: 'Tech', ...over,
});
const detail = (market: string, over: any = {}) => ({
  productId: 'x', title: 't', promotionLink: `https://s.click.aliexpress.com/e/_${market}`, price: market === 'uk' ? 34 : 40,
  currency: market === 'uk' ? 'GBP' : 'EUR', commissionRate: 0.07, shopName: 'Boutique', ratingPercent: 94, sales: 900, mainImage: 'https://ae01.alicdn.com/kf/m.jpg', images: [], ...over,
});

describe('API : recherche de produits', () => {
  it('parseProductQuery : note sur 5, commission, écarte les lignes sans prix', () => {
    const json = { aliexpress_affiliate_product_query_response: { resp_result: { resp_code: 200, result: { products: { product: [
      { product_id: 1005001, product_title: 'A', target_sale_price: '12.50', target_sale_price_currency: 'EUR', evaluate_rate: '94.1%', lastest_volume: 321, commission_rate: '7.0%', shop_name: 'S' },
      { product_id: 1005002, product_title: 'B' },
    ] } } } } };
    const r = parseProductQuery(json);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ productId: '1005001', price: 12.5, rating: 4.71, sales: 321, commissionRate: 0.07, shopName: 'S' });
  });
  it('parseProductQuery : erreur d\'API et réponse inattendue', () => {
    expect(() => parseProductQuery({})).toThrow('inattendue');
    expect(() => parseProductQuery({ aliexpress_affiliate_product_query_response: { resp_result: { resp_code: 500, resp_msg: 'boom' } } })).toThrow('500 boom');
  });
});

describe('API : recherche (tri refusé)', () => {
  const creds = { appKey: 'k', appSecret: 'secret-de-test', trackingId: 't' };
  const okBody = { aliexpress_affiliate_product_query_response: { resp_result: { resp_code: 200, result: { products: { product: [{ product_id: 1, product_title: 'A', target_sale_price: '5' }] } } } } };
  it('refait la recherche sans tri si l\'API refuse le tri', async () => {
    const bodies: string[] = [];
    const fetchImpl = async (_u: string, init: any) => {
      bodies.push(String(init.body));
      return new Response(JSON.stringify(bodies.length === 1 ? { error_response: { code: 'isv.invalid-parameter', msg: 'Invalid sort value' } } : okBody));
    };
    const r = await searchProducts('smart watch', 'fr', { creds, fetchImpl: fetchImpl as any, minGapMs: 0 });
    expect(r).toHaveLength(1);
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toContain('sort=LAST_VOLUME_DESC');
    expect(bodies[1]).not.toContain('sort=');
    expect(bodies[1]).toContain('ship_to_country=FR');
  });
  it('une autre erreur n\'est pas rejouée', async () => {
    let n = 0;
    const fetchImpl = async () => { n++; return new Response(JSON.stringify({ error_response: { code: '1', msg: 'Invalid app key' } })); };
    await expect(searchProducts('x', 'fr', { creds, fetchImpl: fetchImpl as any, minGapMs: 0 })).rejects.toThrow('Invalid app key');
    expect(n).toBe(1);
  });
});

describe('recherche : filtres et classement', () => {
  it('mondayOf : toujours le lundi, dimanche compris', () => {
    expect(mondayOf(new Date('2026-11-12T10:00:00Z'))).toBe('2026-11-09');
    expect(mondayOf(new Date('2026-11-15T23:00:00Z'))).toBe('2026-11-09');
    expect(mondayOf(new Date('2026-11-09T00:00:00Z'))).toBe('2026-11-09');
  });
  it('median et score : commission et popularité comptent, la commission inconnue vaut 3 %', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
    expect(score(item(1, { commissionRate: 0.1 }))).toBeGreaterThan(score(item(1, { commissionRate: 0.05 })));
    expect(score(item(1, { sales: 4000 }))).toBeGreaterThan(score(item(1, { sales: 200 })));
    expect(score(item(1, { commissionRate: null }))).toBeCloseTo(score(item(1, { commissionRate: 0.03 })));
  });
  it('shortlist : écarte note basse, peu de commandes, prix hors fourchette, doublons et produits déjà connus', () => {
    const items = [
      item(1), item(1), // doublon
      item(2, { rating: 4.2 }), item(3, { sales: 20 }), item(4, { price: 3 }), item(5, { price: 900 }),
      item(6), item(7), item(8, { productId: '999' }),
    ];
    const r = shortlist(items, { ...DEFAULTS, perCategory: 2 }, { exclude: new Set(['999']) });
    expect(r.relaxed).toBe(false);
    expect(r.items.map((i: any) => i.productId).sort()).toEqual([1, 6, 7].map((n) => String(1005000000000 + n)));
  });
  it('shortlist : descend à la note plancher si la catégorie manque de produits, et le dit', () => {
    const items = [item(1), item(2, { rating: 4.2 }), item(3, { rating: 4.1 }), item(4, { rating: 3.8 })];
    const r = shortlist(items, { ...DEFAULTS, perCategory: 3 });
    expect(r.relaxed).toBe(true);
    expect(r.items).toHaveLength(3);
    expect(r.items.some((i: any) => i.rating < 4)).toBe(false);
  });
  it('shortlist : trié par note calculée et limité', () => {
    const items = Array.from({ length: 40 }, (_, i) => item(i + 1, { sales: 1000 + i * 10 }));
    const r = shortlist(items, { ...DEFAULTS, shortlist: 25 });
    expect(r.items).toHaveLength(25);
    expect(score(r.items[0])).toBeGreaterThanOrEqual(score(r.items[24]));
  });
});

describe('recherche : choix de Claude', () => {
  const items = [item(1), item(2), item(3)];
  it('parseRanking : garde les identifiants connus, sans doublon, au plus n', () => {
    const text = JSON.stringify({ picks: [{ id: items[1].productId, product_type: 'montre', reason: 'bien' }, { id: 'inconnu' }, { id: items[1].productId }, { id: items[0].productId }] });
    const r = parseRanking(text, new Set(items.map((i) => i.productId)), 5, parseJsonLoose);
    expect(r.map((x: any) => x.id)).toEqual([items[1].productId, items[0].productId]);
    expect(r[0]).toMatchObject({ productType: 'montre', reason: 'bien' });
    expect(parseRanking('pas du json', new Set(), 3, parseJsonLoose)).toEqual([]);
  });
  it('chooseProducts : suit Claude, sinon retombe sur la note calculée', async () => {
    const ok = async () => JSON.stringify({ picks: [{ id: items[2].productId, product_type: 'sac', reason: 'tendance' }] });
    const a = await chooseProducts('Tech', items, 2, { llm: ok, parseJson: parseJsonLoose });
    expect(a.ranked).toBe(true);
    expect(a[0].item.productId).toBe(items[2].productId);
    const boom = async () => { throw new Error('Anthropic 529 : surcharge'); };
    const b = await chooseProducts('Tech', items, 2, { llm: boom, parseJson: parseJsonLoose });
    expect(b.ranked).toBe(false);
    expect(b).toHaveLength(2);
    const c = await chooseProducts('Tech', items, 2, { llm: undefined, parseJson: parseJsonLoose });
    expect(c.ranked).toBe(false);
    const junk = await chooseProducts('Tech', items, 2, { llm: async () => '{"picks":[]}', parseJson: parseJsonLoose });
    expect(junk.ranked).toBe(false);
  });
  it('la consigne cite la catégorie, exige la pertinence et la variété, et chaque produit', () => {
    const p = buildRankPrompt('Tech', items, 10);
    expect(p).toContain('« Tech »');
    expect(p).toContain('hors sujet');
    expect(p).toContain('au plus 2 produits du même type');
    for (const i of items) expect(p).toContain(i.productId);
  });
});

describe('recherche : ligne enregistrée', () => {
  const choice = { item: item(1), productType: 'montre GPS', reason: 'très demandée' };
  it('prix par marché, UK absent = pas de lien UK, devise contrôlée', () => {
    const row = buildRow({ week: '2026-11-09', slug: 'tech', choice, details: { fr: detail('fr'), es: detail('es', { price: 41 }), uk: null } });
    expect(row).toMatchObject({ aliexpress_id: item(1).productId, week: '2026-11-09', category_slug: 'tech', price_fr: 40, price_es: 41, price_uk: null, url_uk: null, product_type: 'montre GPS', commission_fr: 0.07 });
    expect(row.url_fr).toBe(`https://www.aliexpress.com/item/${item(1).productId}.html`);
    expect(row.note).toContain('très demandée');
    expect(row.reviews).toBeNull();
    // l'API répond en dollars pour l'Espagne : pas de prix ES
    const usd = buildRow({ week: 'w', slug: 'tech', choice, details: { fr: detail('fr'), es: detail('es', { currency: 'USD' }), uk: detail('uk') } });
    expect(usd.price_es).toBeNull();
    expect(usd.price_uk).toBe(34);
    expect(usd.url_uk).not.toBeNull();
  });
  it('relevé UK en erreur (limite de l\'API) : le lien UK est gardé, pas déclaré absent', () => {
    const row = buildRow({ week: 'w', slug: 'tech', choice, details: { fr: detail('fr'), es: detail('es'), uk: { error: true } } });
    expect(row.price_uk).toBeNull();
    expect(row.url_uk).toBe(`https://www.aliexpress.com/item/${item(1).productId}.html`);
    expect(buildRow({ week: 'w', slug: 'tech', choice, details: { fr: { error: true }, es: { error: true }, uk: { error: true } } })).toBeNull();
  });
  it('produit introuvable partout ou sans lien affilié : écarté', () => {
    expect(buildRow({ week: 'w', slug: 'tech', choice, details: { fr: null, es: null, uk: null } })).toBeNull();
    expect(buildRow({ week: 'w', slug: 'tech', choice, details: { fr: detail('fr', { promotionLink: null }), es: null, uk: null } })).toBeNull();
  });
});

function makeDeps(over: any = {}) {
  const logs: string[] = [];
  const calls = { search: 0, product: 0, llm: 0 };
  const deps: any = {
    search: async (kw: string) => { calls.search++; const base = kw.length * 100; return Array.from({ length: 6 }, (_, i) => item(base + i)); },
    getProduct: async (_id: string, m: string) => { calls.product++; return detail(m); },
    llm: async () => { calls.llm++; throw new Error('pas de Claude dans ce test'); },
    parseJson: parseJsonLoose, log: (m: string) => logs.push(m), ...over,
  };
  return { deps, logs, calls };
}

describe('recherche : semaine complète', () => {
  it('une catégorie : 5 produits au plus, 3 marchés relevés, sans doublon', async () => {
    const { deps, calls } = makeDeps();
    const r = await searchWeek(deps, { week: '2026-11-09', categories: ['tech'], exclude: new Set(), cfg: { ...DEFAULTS, perCategory: 5 } });
    expect(r.rows.length).toBeLessThanOrEqual(5);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(calls.search).toBe(CATEGORY_QUERIES.tech.length);
    expect(calls.product).toBe(r.rows.length * 3);
    expect(new Set(r.rows.map((x: any) => x.aliexpress_id)).size).toBe(r.rows.length);
    expect(r.warnings.join(' ')).toContain('classé par la note calculée');
  });
  it('un produit déjà connu n\'est pas reproposé', async () => {
    const { deps } = makeDeps({ search: async () => [item(1), item(2), item(3)] });
    const r = await searchWeek(deps, { week: 'w', categories: ['tech'], exclude: new Set([item(1).productId]), cfg: { ...DEFAULTS, perCategory: 5 } });
    expect(r.rows.map((x: any) => x.aliexpress_id)).not.toContain(item(1).productId);
    expect(r.rows).toHaveLength(2);
  });
  it('relevés de prix en erreur : comptés, signalés, et le produit reste proposé', async () => {
    const { deps } = makeDeps({ search: async () => [item(1), item(2), item(3)], getProduct: async (_id: string, m: string) => { if (m === 'uk') throw new Error('API AliExpress : ApiCallLimit'); return detail(m); } });
    const r = await searchWeek(deps, { week: 'w', categories: ['tech'], cfg: { ...DEFAULTS, perCategory: 3 } });
    expect(r.rows).toHaveLength(3);
    expect(r.detailErrors).toBe(3);
    expect(r.warnings.join(' ')).toContain('relevé(s) de prix ont échoué');
    expect(r.rows.every((x: any) => x.price_uk === null && x.url_uk)).toBe(true);
  });
  it('une recherche en erreur ne bloque pas les autres, mais est comptée', async () => {
    let n = 0;
    const { deps } = makeDeps({ search: async () => { n++; if (n === 1) throw new Error('API AliExpress : 429'); return [item(n * 10), item(n * 10 + 1), item(n * 10 + 2)]; } });
    const r = await searchWeek(deps, { week: 'w', categories: ['tech'] });
    expect(r.searchErrors).toBe(1);
    expect(r.rows.length).toBeGreaterThan(0);
  });
});

describe('recherche : enregistrement et sécurité', () => {
  const NOW = new Date('2026-11-12T08:00:00Z');
  const tables = () => ({ trend_candidates: [] as any[], products: [] as any[] });

  it('enregistre la semaine, supprime les anciens non décidés mais garde refusés et validés', async () => {
    const t = tables();
    t.trend_candidates.push(
      { id: 'a', aliexpress_id: '1', week: '2026-11-02', decision: 'pending', status: 'candidate' },
      { id: 'b', aliexpress_id: '2', week: '2026-11-02', decision: 'no', status: 'candidate' },
      { id: 'c', aliexpress_id: '3', week: '2026-11-02', decision: 'yes', status: 'live' },
    );
    const { deps } = makeDeps();
    const r = await runSearch(deps, { sb: fakeDb(t), now: NOW, categories: ['tech'], cfg: { ...DEFAULTS, perCategory: 4 } });
    expect(r.error).toBeUndefined();
    expect(r.week).toBe('2026-11-09');
    expect(r.created).toBeGreaterThan(0);
    expect(r.purged).toBe(1);
    expect(t.trend_candidates.find((x) => x.id === 'a')).toBeUndefined();
    expect(t.trend_candidates.find((x) => x.id === 'b')).toBeDefined();
    expect(t.trend_candidates.find((x) => x.id === 'c')).toBeDefined();
    expect(t.trend_candidates.filter((x) => x.week === '2026-11-09')).toHaveLength(r.created);
    expect(reportText(r)).toContain('proposé(s)');
  });
  it('déjà faite cette semaine : rien ne se passe (sauf --force)', async () => {
    const t = tables();
    for (let i = 0; i < DEFAULTS.alreadyDone; i++) t.trend_candidates.push({ id: `x${i}`, aliexpress_id: `9${i}`, week: '2026-11-09', decision: 'pending', status: 'candidate' });
    const { deps, calls } = makeDeps();
    const r = await runSearch(deps, { sb: fakeDb(t), now: NOW, categories: ['tech'] });
    expect(r.skipped).toContain('déjà');
    expect(calls.search).toBe(0);
    expect(reportText(r)).toContain('Rien à faire');
    const forced = await runSearch(deps, { sb: fakeDb(t), now: NOW, force: true, categories: ['tech'], cfg: { ...DEFAULTS, perCategory: 2 } });
    expect(forced.skipped).toBeUndefined();
    expect(calls.search).toBeGreaterThan(0);
  });
  it('recherche en échec : aucune suppression, aucune écriture', async () => {
    const t = tables();
    t.trend_candidates.push({ id: 'a', aliexpress_id: '1', week: '2026-11-02', decision: 'pending', status: 'candidate' });
    const { deps } = makeDeps({ search: async () => { throw new Error('API AliExpress : 500'); } });
    const r = await runSearch(deps, { sb: fakeDb(t), now: NOW, categories: ['tech'] });
    expect(r.error).toContain('rien n\'a été modifié');
    expect(t.trend_candidates).toHaveLength(1);
    expect(reportText(r)).toContain('ÉCHEC');
  });
  it('simulation : rien n\'est écrit', async () => {
    const t = tables();
    t.trend_candidates.push({ id: 'a', aliexpress_id: '1', week: '2026-11-02', decision: 'pending', status: 'candidate' });
    const { deps } = makeDeps();
    const r = await runSearch(deps, { sb: fakeDb(t), now: NOW, dryRun: true, categories: ['tech'], cfg: { ...DEFAULTS, perCategory: 3 } });
    expect(r.preview.length).toBeGreaterThan(0);
    expect(t.trend_candidates).toHaveLength(1);
    expect(reportText(r)).toContain('SIMULATION');
    expect(reportText(r)).toContain('seraient proposé');
  });
  it('loadExclusions : produits en fiche, en cours, ou refusés depuis moins de 8 semaines', async () => {
    const t = tables();
    t.products.push({ aliexpress_id: '11' }, { aliexpress_id: null });
    t.trend_candidates.push(
      { aliexpress_id: '21', decision: 'yes', status: 'in_progress', week: '2026-10-05' },
      { aliexpress_id: '22', decision: 'no', status: 'candidate', week: '2026-10-26' },
      { aliexpress_id: '23', decision: 'no', status: 'candidate', week: '2026-06-01' },
      { aliexpress_id: '24', decision: 'pending', status: 'candidate', week: '2026-11-02' },
    );
    const ex = await loadExclusions(fakeDb(t), '2026-11-09');
    expect([...ex].sort()).toEqual(['11', '21', '22']);
  });
  it('saveWeek : ne touche pas à un produit déjà présent cette semaine, et un lot refusé est repris ligne à ligne', async () => {
    const t = tables();
    t.trend_candidates.push({ id: 'k', aliexpress_id: '5', week: '2026-11-09', decision: 'yes', status: 'validated' });
    const rows = ['5', '6', '7'].map((id) => ({ aliexpress_id: id, week: '2026-11-09', name: `P${id}` }));
    const r = await saveWeek(fakeDb(t, { failInsertOnce: true }), '2026-11-09', rows);
    expect(r).toMatchObject({ created: 2, existing: 1, failed: [] });
    expect(t.trend_candidates.find((x) => x.aliexpress_id === '5')?.decision).toBe('yes');
  });
});

describe('e-mails', () => {
  it('récapitulatif de la recherche : nombre, catégories, avertissements', () => {
    const m = renderEmail({ kind: 'trends', result: { week: '2026-11-09', created: 62, purged: 12, summary: [{ label: 'Tech', kept: 9, ranked: true }, { label: 'Loisirs', kept: 7, ranked: false }], warnings: ['Loisirs : …'], failed: [] } });
    expect(m.subject).toContain('62 nouvelles tendances');
    expect(m.html).toContain('Tech');
    expect(m.html).toContain('livraison gratuite');
  });
  it('échec de la recherche : dit que rien n\'a été modifié', () => {
    const m = renderEmail({ kind: 'trends', result: { week: '2026-11-09', error: 'API en panne', warnings: [] } });
    expect(m.subject).toContain('échec');
    expect(m.html).toContain('Rien n\'a été modifié');
  });
  it('vidéos ajoutées', () => {
    const m = renderEmail({ kind: 'videos', result: { found: 2, checked: 5, lines: ['a : url'] } });
    expect(m.subject).toContain('Vidéos');
  });
});

describe('vidéos : rattrapage', () => {
  const NOW = new Date('2026-11-12T08:00:00Z');
  const prod = (id: string, name: string, over: any = {}) => ({ id, slug: `s-${id}`, name, market: 'fr', active: true, video_url: null, ...over });
  it('pickTargets : sans vidéo, avec repère de modèle, pas cherchée récemment, en ligne d\'abord', () => {
    const products = [
      prod('1', 'Garmin Forerunner 265'), prod('2', 'Masque LED visage'), prod('3', 'Montre Amazfit GTR 4', { video_url: 'https://youtu.be/x' }),
      prod('4', 'AMD Ryzen 7800X3D', { active: false }), prod('5', 'Casque Sony WH-1000XM5'),
    ];
    const r = pickTargets(products, { '5': '2026-11-01T00:00:00Z' }, NOW, 10);
    expect(r.todo.map((p: any) => p.id)).toEqual(['1', '4']);
    expect(r.noModel).toBe(1);
    expect(r.recent).toBe(1);
    expect(pickTargets(products, { '5': '2026-09-01T00:00:00Z' }, NOW, 1)).toMatchObject({ waiting: 2 });
  });
  it('backfillVideos : écrit les vidéos trouvées, retient les échecs, s\'arrête au quota', async () => {
    const t = { products: [prod('1', 'Garmin Forerunner 265'), prod('2', 'AMD Ryzen 7800X3D'), prod('3', 'Sony WH-1000XM5')] as any[] };
    const find = async ({ name }: any) => {
      if (name.includes('Garmin')) return { url: 'https://www.youtube.com/watch?v=g', title: 'Test Garmin' };
      if (name.includes('AMD')) return null;
      throw new Error('YouTube 403');
    };
    const r = await backfillVideos({ sb: fakeDb(t), find, misses: {}, now: NOW });
    expect(r.found).toBe(1);
    expect(r.quotaHit).toBe(true);
    expect(t.products[0].video_url).toBe('https://www.youtube.com/watch?v=g');
    expect(t.products[1].video_url).toBeNull();
    expect(r.misses['2']).toBe(NOW.toISOString());
    expect(r.misses['3']).toBeUndefined();
  });
  it('simulation : n\'écrit rien', async () => {
    const t = { products: [prod('1', 'Garmin Forerunner 265')] as any[] };
    const r = await backfillVideos({ sb: fakeDb(t), find: async () => ({ url: 'https://www.youtube.com/watch?v=g' }), misses: {}, now: NOW, dryRun: true });
    expect(r.found).toBe(1);
    expect(t.products[0].video_url).toBeNull();
  });
  it('statusText : compte par marché', () => {
    const s = statusText([prod('1', 'Garmin Forerunner 265', { video_url: 'u' }), prod('2', 'Masque LED visage'), prod('3', 'Sony WH-1000XM5', { market: 'es' })]);
    expect(s).toContain('FR : 1 avec vidéo sur 2');
    expect(s).toContain('ES : 0 avec vidéo sur 1');
  });
});

describe('photos : images supplémentaires', () => {
  const normalize = (u: string) => (typeof u === 'string' && /^https?:\/\//.test(u) ? u.split('?')[0].replace(/_\d+x\d+.*$/, '') : null);
  it('cleanImageUrl : https et hôtes AliExpress seulement', () => {
    expect(cleanImageUrl('https://ae01.alicdn.com/kf/a.jpg?x=1', normalize)).toBe('https://ae01.alicdn.com/kf/a.jpg');
    expect(cleanImageUrl('http://ae01.alicdn.com/kf/a.jpg', normalize)).toBeNull();
    expect(cleanImageUrl('https://evil.example.com/a.jpg', normalize)).toBeNull();
    expect(cleanImageUrl('https://alicdn.com.evil.com/a.jpg', normalize)).toBeNull();
    expect(cleanImageUrl('n/importe quoi', normalize)).toBeNull();
  });
  it('planImages : erreur → remis sur OUI ; prêt ou en ligne → redo ; pas décidé → images seulement', () => {
    const base = { decision: 'yes', image_urls: ['https://ae01.alicdn.com/kf/a.jpg'] };
    const err = planImages({ ...base, status: 'error' }, ['https://ae01.alicdn.com/kf/b.jpg']);
    expect(err.action).toBe('retry');
    expect(err.patch).toMatchObject({ status: 'validated', error: null, photos_status: 'none', photos: [] });
    expect(err.merged).toHaveLength(2);
    expect(err.added).toBe(1);
    expect(planImages({ ...base, status: 'live' }, ['https://ae01.alicdn.com/kf/b.jpg']).patch.photos_status).toBe('redo');
    expect(planImages({ ...base, status: 'ready' }, ['https://ae01.alicdn.com/kf/b.jpg']).action).toBe('redo');
    const undecided = planImages({ decision: 'pending', status: 'candidate', image_urls: [] }, ['https://ae01.alicdn.com/kf/b.jpg']);
    expect(undecided.action).toBe('store');
    expect(undecided.patch.status).toBeUndefined();
    expect(planImages({ ...base, status: 'in_progress' }, ['https://ae01.alicdn.com/kf/b.jpg']).patch.status).toBeUndefined();
  });
  it('planImages : sans images enregistrées, reprend celles de l\'API et ne compte pas deux fois le même lien', () => {
    const r = planImages({ decision: 'yes', status: 'error', image_urls: [] }, ['https://ae01.alicdn.com/kf/a.jpg', 'https://ae01.alicdn.com/kf/n.jpg'], ['https://ae01.alicdn.com/kf/a.jpg']);
    expect(r.merged).toEqual(['https://ae01.alicdn.com/kf/a.jpg', 'https://ae01.alicdn.com/kf/n.jpg']);
    expect(r.added).toBe(1);
  });
  it('applyImages : écrit, refuse les inconnus et les mauvaises adresses, simulation sans écriture', async () => {
    const t = { trend_candidates: [{ id: 'c1', aliexpress_id: '1005001', week: '2026-11-02', name: 'Produit', decision: 'yes', status: 'error', image_urls: [], photos: [{ public_id: 'x' }], photos_status: 'error' }] as any[] };
    const input = { '1005001': ['https://ae01.alicdn.com/kf/a.jpg', 'https://ae01.alicdn.com/kf/b.jpg'], '1005999': ['https://ae01.alicdn.com/kf/c.jpg'], '1005002': ['https://evil.example.com/z.jpg'], 'abc': ['x'] };
    const dry = await applyImages(fakeDb(t), input, { normalize, dryRun: true });
    expect(t.trend_candidates[0].status).toBe('error');
    expect(dry.filter((r: any) => r.ok)).toHaveLength(1);
    const rows = await applyImages(fakeDb(t), input, { normalize, apiImages: async () => ['https://ae01.alicdn.com/kf/api.jpg'] });
    expect(t.trend_candidates[0]).toMatchObject({ status: 'validated', photos_status: 'none', photos: [] });
    expect(t.trend_candidates[0].image_urls).toHaveLength(3);
    expect(rows.find((r: any) => r.id === '1005999').message).toContain('introuvable');
    expect(rows.find((r: any) => r.id === '1005002').message).toContain('aucune adresse');
    expect(rows.find((r: any) => r.id === 'abc').message).toContain('invalide');
    expect(imagesReport(rows, false)).toContain('remis sur OUI');
  });
});

describe('worker : reprise des photos d\'un produit déjà en ligne', () => {
  it('photos_status « redo » → le tri est refait, les fiches reçoivent les nouvelles photos, puis plus rien à reprendre', async () => {
    const cand = {
      id: 'c1', aliexpress_id: '1005010428515910', week: '2026-11-02', category_slug: 'tech', name: 'Garmin Forerunner 165', rating: 4.8,
      price_fr: 40, price_es: 40, price_uk: null, url_fr: 'https://www.aliexpress.com/item/1005010428515910.html', url_uk: null,
      free_shipping_fr: 'Oui', free_shipping_es: 'Oui', free_shipping_uk: null, product_type: 'montre GPS', note: null,
      decision: 'yes', status: 'live', decided_at: '2026-11-02T08:00:00Z', photos: [], photos_status: 'redo', image_urls: ['https://ae01.alicdn.com/kf/a.jpg'], pipeline_log: null, product_ids: [], published_at: '2026-11-03T10:00:00Z',
    };
    const t: any = { trend_candidates: [cand], products: [], categories: [{ id: 'cat-tech', slug: 'tech' }] };
    const asked: any[] = [];
    const WARRANTY: Record<string, string> = { fr: 'Produit garanti.', es: 'Producto garantizado.', en: 'Warranty as stated in the offer.' };
    const goodRaw = (lang: string) => ({
      name: 'Garmin Forerunner 165 montre GPS', hero_title: 'La montre GPS pour courir', hero_subtitle: 'Une montre légère pour suivre tes sorties.',
      description: `Première partie de la description.\n\nSeconde partie, usage au quotidien. ${WARRANTY[lang]}`,
      benefits: ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => ({ icon: '⌚', title: `Atout ${x}`, description: `Description ${x}` })),
      faq: [1, 2, 3, 4].map((i) => ({ question: `Question ${i} ?`, answer: `Réponse ${i}.` })), meta_title: 'Garmin Forerunner 165 | Tendpick', meta_description: 'Une montre GPS légère.',
    });
    const d: any = {
      sb: fakeDb(t), log: () => {}, now: () => new Date('2026-11-12T10:00:00Z'),
      api: { getProduct: async (_id: string, m: string) => (m === 'uk' ? null : detail(m)), verify: async () => ({ ok: true, checks: [] }) },
      llm: async (prompt: string) => JSON.stringify(goodRaw(prompt.includes('anglais') ? 'en' : prompt.includes('espagnol') ? 'es' : 'fr')),
      photos: async (row: any) => { asked.push(row.image_urls); return { photos: [1, 2, 3].map((i) => ({ public_id: `products/new-${i}` })), report: { warnings: [] } }; },
      mail: async () => {},
    };
    const r = await runOnce(d);
    expect(r.prepared.map((x: any) => x.outcome)).toEqual(['ready']);
    expect(asked).toHaveLength(1);
    expect(asked[0]).toEqual(['https://ae01.alicdn.com/kf/a.jpg']);
    expect(r.prepared[0].outcome).toBe('ready');
    expect(t.trend_candidates[0].photos_status).toBe('attached');
    expect(t.products.every((p: any) => p.images.join() === 'products/new-1,products/new-2,products/new-3')).toBe(true);
    asked.length = 0;
    await runOnce(d);
    expect(asked).toHaveLength(0);
  });
});
