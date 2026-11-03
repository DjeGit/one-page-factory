import { describe, it, expect } from 'vitest';
// @ts-ignore — modules Node purs (.mjs)
import { checkCandidate, computePublishAt, isPriceStale, parseFreeShipping, publishIssues, needsManualReview, priceGap } from '../scripts/pipeline/gates.mjs';
// @ts-ignore
import { collectOffers, itemIdFor } from '../scripts/pipeline/offers.mjs';
// @ts-ignore
import { validateFicheText, generateFicheText, buildPrompt, fit, fixedFaq, longDate } from '../scripts/pipeline/fiche-text.mjs';
// @ts-ignore
import { extractSpecs, formatSpecs } from '../scripts/pipeline/specs.mjs';
// @ts-ignore
import { slugify, uniqueSlug, buildProductRow } from '../scripts/pipeline/fiches.mjs';
// @ts-ignore
import { renderEmail, sendMail } from '../scripts/pipeline/notify.mjs';
// @ts-ignore
import { runOnce, publishDue } from '../scripts/pipeline/worker.mjs';

// ─── Données de test ────────────────────────────────────────────────────────
const WARRANTY: Record<string, string> = { fr: 'Produit garanti.', es: 'Producto garantizado.', en: 'Warranty as stated in the offer.' };
const goodRaw = (lang: string, over: any = {}) => ({
  name: 'Garmin Forerunner 165 montre GPS', hero_title: 'La montre GPS pour courir', hero_subtitle: 'Une montre légère pour suivre tes sorties.',
  description: `Première partie de la description.\n\nSeconde partie, usage au quotidien. ${WARRANTY[lang]}`,
  benefits: ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => ({ icon: '⌚', title: `Atout ${x}`, description: `Description ${x}` })),
  faq: [1, 2, 3, 4].map((i) => ({ question: `Question ${i} ?`, answer: `Réponse ${i}.` })),
  meta_title: 'Garmin Forerunner 165 | Tendpick', meta_description: 'Une montre GPS légère.', ...over,
});
const llmOk = async (prompt: string) => JSON.stringify(goodRaw(prompt.includes('anglais') ? 'en' : prompt.includes('espagnol') ? 'es' : 'fr'));

const detail = (market: string, over: any = {}) => ({
  productId: '1005010428515910', title: `Garmin Forerunner 165 ${market}`, promotionLink: `https://s.click.aliexpress.com/e/_${market}`, price: market === 'uk' ? 150 : 180.69,
  currency: market === 'uk' ? 'GBP' : 'EUR', commissionRate: 0.07, shopName: 'Boutique', mainImage: 'https://ae01.alicdn.com/kf/a.jpg', images: ['https://ae01.alicdn.com/kf/b.jpg'], ...over,
});
const cand = (over: any = {}) => ({
  id: 'c1', aliexpress_id: '1005010428515910', week: '2026-11-02', category_slug: 'tech', name: 'Garmin Forerunner 165', rating: 4.8,
  price_fr: 190, price_es: 185, price_uk: 155, url_fr: 'https://www.aliexpress.com/item/1005010428515910.html', url_uk: 'https://www.aliexpress.com/item/1005011111111111.html',
  free_shipping_fr: 'Oui', free_shipping_es: 'Oui', free_shipping_uk: 'Non', product_type: 'montre GPS', note: null,
  decision: 'yes', status: 'validated', decided_at: '2026-11-02T08:00:00Z', photos: [], photos_status: 'none', image_urls: [], pipeline_log: null, product_ids: [], ...over,
});

// ─── Faux client Supabase en mémoire ────────────────────────────────────────
function fakeDb(tables: Record<string, any[]>) {
  let seq = 0;
  const from = (name: string) => {
    const st: any = { op: 'select', filters: [] as ((r: any) => boolean)[], patch: null, row: null, want: false, single: false, maybe: false, head: false, limit: null };
    const b: any = {
      select(_c?: string, o?: any) { st.want = true; if (o?.head) st.head = true; return b; },
      insert(row: any) { st.op = 'insert'; st.row = row; return b; },
      update(p: any) { st.op = 'update'; st.patch = p; return b; },
      eq(c: string, v: any) { st.filters.push((r: any) => r[c] === v); return b; },
      in(c: string, vs: any[]) { st.filters.push((r: any) => vs.includes(r[c])); return b; },
      lt(c: string, v: any) { st.filters.push((r: any) => r[c] < v); return b; },
      like(c: string, pat: string) { const re = new RegExp('^' + pat.replace(/%/g, '.*') + '$'); st.filters.push((r: any) => re.test(r[c])); return b; },
      order() { return b; },
      limit(n: number) { st.limit = n; return b; },
      single() { st.single = true; return b; },
      maybeSingle() { st.maybe = true; return b; },
      then(res: any, rej: any) {
        const t = tables[name];
        const hit = t.filter((r) => st.filters.every((f: any) => f(r)));
        let out: any;
        if (st.op === 'insert') {
          const row = { id: `id${++seq}`, ...st.row };
          t.push(row);
          out = { data: st.want ? row : null, error: null };
        } else if (st.op === 'update') {
          hit.forEach((r) => Object.assign(r, st.patch));
          out = { data: st.want ? hit.map((r) => ({ id: r.id })) : null, error: null };
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

function makeDeps(tables: Record<string, any[]>, over: any = {}) {
  const clock = { t: new Date('2026-11-02T10:00:00Z') };
  const mails: any[] = [];
  const logs: string[] = [];
  const offers: Record<string, any> = { fr: detail('fr'), es: detail('es', { price: 183 }), uk: detail('uk') };
  const d: any = {
    sb: fakeDb(tables), log: (m: string) => logs.push(m), now: () => clock.t,
    api: { getProduct: async (_id: string, market: string) => offers[market] ?? null, verify: async () => ({ ok: true, checks: [] }) },
    llm: llmOk,
    photos: async () => ({ photos: [1, 2, 3].map((i) => ({ public_id: `products/ae-x-${i}` })), report: { warnings: [] } }),
    mail: async (p: any) => { mails.push(p); },
    ...over,
  };
  return { d, clock, mails, logs, offers };
}
const tables = (c: any[] = [cand()]) => ({ trend_candidates: c, products: [] as any[], categories: [{ id: 'cat-tech', slug: 'tech' }] });

// ─── Tests ──────────────────────────────────────────────────────────────────
describe('gates', () => {
  it('checkCandidate : note minimale 4', () => {
    expect(checkCandidate({ rating: 4.5, aliexpress_id: '1' })).toEqual([]);
    expect(checkCandidate({ rating: 3.9, aliexpress_id: '1' })[0]).toContain('minimum 4');
    expect(checkCandidate({ rating: null, aliexpress_id: '1' })[0]).toContain('absente');
  });
  it('computePublishAt : 24 h pour la 1re fiche, immédiat ensuite', () => {
    const now = new Date('2026-11-02T10:00:00Z');
    expect(computePublishAt(now, 0).toISOString()).toBe('2026-11-03T10:00:00.000Z');
    expect(computePublishAt(now, 2).toISOString()).toBe(now.toISOString());
  });
  it('prix : écart, ancienneté, livraison gratuite, fiche prête, catégories sensibles', () => {
    expect(priceGap(100, 125)).toBeCloseTo(0.25);
    expect(priceGap(null, 1)).toBeNull();
    expect(isPriceStale('2026-11-02', new Date('2026-11-02T20:00:00Z'))).toBe(false);
    expect(isPriceStale('2026-11-02', new Date('2026-11-03T10:00:00Z'))).toBe(true);
    expect(isPriceStale(null, new Date())).toBe(true);
    expect(parseFreeShipping('Oui')).toBe(true);
    expect(parseFreeShipping('Non')).toBe(false);
    expect(parseFreeShipping(null)).toBe(false);
    expect(publishIssues({ affiliate_url: 'https://s.click.aliexpress.com/e/_a', images: ['x'], price: 10, price_checked_at: '2026-11-02' })).toEqual([]);
    expect(publishIssues({ affiliate_url: 'https://www.aliexpress.com/item/1.html', images: [], price: null, price_checked_at: null })).toHaveLength(3);
    expect(needsManualReview('puericulture')).toContain('CE');
    expect(needsManualReview('tech')).toBeNull();
  });
});

describe('offers', () => {
  it('itemIdFor : annonce UK distincte', () => {
    expect(itemIdFor(cand(), 'fr')).toBe('1005010428515910');
    expect(itemIdFor(cand(), 'uk')).toBe('1005011111111111');
    expect(itemIdFor(cand({ url_uk: null }), 'uk')).toBe('1005010428515910');
  });
  it('ok, introuvable, sans prix, lien refusé, erreur API, UK sans annonce', async () => {
    const calls: string[] = [];
    const api = {
      getProduct: async (_id: string, m: string) => {
        calls.push(m);
        if (m === 'fr') return detail('fr');
        if (m === 'es') return null;
        throw new Error('ApiCallLimit');
      },
      verify: async () => ({ ok: true, checks: [] }),
    };
    const r = await collectOffers(cand(), api);
    expect(r.map((o: any) => [o.market, o.status])).toEqual([['fr', 'ok'], ['es', 'unavailable'], ['uk', 'error']]);
    const r2 = await collectOffers(cand({ url_uk: null, price_uk: null }), api);
    expect(r2[2].status).toBe('unavailable');
    expect(calls.filter((m) => m === 'uk')).toHaveLength(1); // pas d'appel UK la 2e fois
    const r3 = await collectOffers(cand(), { getProduct: async () => detail('fr', { price: null }), verify: async () => ({ ok: true, checks: [] }) }, ['fr']);
    expect(r3[0].status).toBe('blocked');
    const r4 = await collectOffers(cand(), { getProduct: async () => detail('fr'), verify: async () => ({ ok: false, checks: [{ name: 'prix', ok: false, detail: 'écart 37 %' }] }) }, ['fr']);
    expect(r4[0]).toMatchObject({ status: 'blocked', reasons: ['prix : écart 37 %'] });
  });
});

describe('fiche-text', () => {
  it('accepte un bon texte et ajuste les méta', () => {
    const v = validateFicheText(goodRaw('fr', { meta_title: 'x '.repeat(50) }), 'fr');
    expect(v.ok).toBe(true);
    expect(v.text.meta_title.length).toBeLessThanOrEqual(60);
    expect(v.text.meta_title.endsWith(' | Tendpick')).toBe(true);
    expect(v.text.benefits).toHaveLength(6);
  });
  it('refuse : AliExpress, avis des acheteurs, authenticité, urgence, prix, garantie absente, trop peu de bénéfices', () => {
    const bad = (over: any, lang = 'fr') => validateFicheText(goodRaw(lang, over), lang).errors.join(' | ');
    expect(bad({ hero_subtitle: 'Disponible sur AliExpress' })).toContain('AliExpress');
    expect(bad({ faq: [{ question: 'Q ?', answer: "D'après les acheteurs, c'est top." }, ...goodRaw('fr').faq] })).toContain('acheteurs');
    expect(bad({ hero_subtitle: 'Livré dans sa boîte d’origine' })).toContain('authenticité');
    expect(bad({ hero_subtitle: 'Dernières pièces en stock' })).toContain('urgence');
    expect(bad({ hero_subtitle: 'Seulement 99 € aujourd’hui' })).toContain('prix');
    expect(bad({ hero_subtitle: 'Soulage tes muscles en profondeur' })).toContain('promesse de santé');
    expect(bad({ description: 'Un paragraphe.\n\nUn autre sans la mention.' })).toContain('garantie');
    expect(bad({ benefits: goodRaw('fr').benefits.slice(0, 3) })).toContain('5 bénéfices');
    expect(validateFicheText(goodRaw('en'), 'en').ok).toBe(true);
    expect(validateFicheText(goodRaw('es'), 'es').ok).toBe(true);
    expect(validateFicheText(goodRaw('fr'), 'es').errors.join()).toContain('Producto garantizado');
  });
  it('normalise : pas de point final dans les titres ; le prompt impose casse de phrase et mention médicale', () => {
    const v = validateFicheText(goodRaw('fr', { name: 'Pistolet de massage.', hero_title: 'Accroche.', meta_title: 'Titre. | Tendpick.' }), 'fr');
    expect(v.text.name).toBe('Pistolet de massage');
    expect(v.text.hero_title).toBe('Accroche');
    expect(v.text.meta_title).toBe('Pistolet de massage | Tendpick');
    expect(v.text.benefits.every((b: any) => !b.title.endsWith('.'))).toBe(true);
    const prompt = buildPrompt({ lang: 'es', title: 'T', categoryLabel: 'Sport' });
    expect(prompt).toContain('No sustituye a un dispositivo médico.');
    expect(prompt).toContain('Casse de phrase');
  });
  it('meta_description : coupée en fin de phrase, sinon refusée', () => {
    const long = 'Première phrase complète et assez longue pour dépasser largement la moitié de la limite autorisée. Deuxième phrase qui dépasse la limite des cent cinquante-cinq caractères et ne doit pas apparaître.';
    expect(validateFicheText(goodRaw('fr', { meta_description: long }), 'fr').text.meta_description).toBe('Première phrase complète et assez longue pour dépasser largement la moitié de la limite autorisée.');
    const noStop = 'mot '.repeat(60);
    expect(validateFicheText(goodRaw('fr', { meta_description: noStop }), 'fr').errors.join()).toContain('meta_description trop longue');
  });
  it('specs : extraction, doublons, valeurs vides, prompt', () => {
    const html = '..."attrName":"Brand Name","attrValue":"Other"..."attrName":"Battery","attrValue":"2000 mAh"..."attrName":"Battery","attrValue":"x"..."attrName":"Mode d\\u0027emploi","attrValue":"Auto"';
    const s = extractSpecs(html);
    expect(s.map((x: any) => x.name)).toEqual(['Battery', "Mode d'emploi"]);
    expect(s[0].value).toBe('2000 mAh');
    expect(formatSpecs(s)).toBe("- Battery : 2000 mAh\n- Mode d'emploi : Auto");
    expect(extractSpecs('"name":"Voltage","value":"5V"')).toEqual([{ name: 'Voltage', value: '5V' }]);
    expect(buildPrompt({ lang: 'fr', title: 'T', categoryLabel: 'C', specs: formatSpecs(s) })).toContain('- Battery : 2000 mAh');
    expect(buildPrompt({ lang: 'fr', title: 'T', categoryLabel: 'C' })).not.toContain('CARACTÉRISTIQUES DE L');
  });
  it('generateFicheText : une 2e tentative avec les raisons, puis abandon', async () => {
    const prompts: string[] = [];
    let n = 0;
    const llm = async (p: string) => { prompts.push(p); return JSON.stringify(++n === 1 ? goodRaw('fr', { hero_subtitle: 'Sur AliExpress' }) : goodRaw('fr')); };
    const r = await generateFicheText({ lang: 'fr', title: 'T', categoryLabel: 'Tech' }, { llm });
    expect(r.attempts).toBe(2);
    expect(prompts[1]).toContain('REFUSÉE');
    await expect(generateFicheText({ lang: 'fr', title: 'T', categoryLabel: 'Tech' }, { llm: async () => 'pas du json' })).rejects.toThrow(/refusé après 2 essais/);
  });
  it('utilitaires : fit, dates, FAQ fixes', () => {
    expect(fit('un deux trois quatre', 12)).toBe('un deux');
    expect(longDate('fr', '2026-11-02')).toBe('2 novembre 2026');
    expect(longDate('es', '2026-11-02')).toBe('2 de noviembre de 2026');
    const f = fixedFaq('fr', 180.69, '2026-11-02');
    expect(f[1].answer).toContain('180,69 €');
    expect(f[1].answer).toContain('2 novembre 2026');
    expect(fixedFaq('en', 150, '2026-11-02')[1].answer).toContain('£150.00');
  });
});

describe('fiches', () => {
  it('slugify et slugs uniques', () => {
    expect(slugify('Écouteurs à conduction osseuse – Shokz')).toBe('ecouteurs-a-conduction-osseuse-shokz');
    const taken = new Set(['abc', 'abc-2']);
    expect(uniqueSlug('abc', taken)).toBe('abc-3');
    expect(uniqueSlug('abc', taken)).toBe('abc-4');
  });
  it('buildProductRow : brouillon daté avec lien, prix, livraison et FAQ fixes', () => {
    const text = validateFicheText(goodRaw('fr'), 'fr').text;
    const row = buildProductRow({ candidate: cand(), offer: { market: 'fr', itemId: '1005010428515910', detail: detail('fr') }, text, today: '2026-11-02', categoryId: 'cat-tech', slug: 'garmin' });
    expect(row).toMatchObject({ active: false, market: 'fr', price: 180.69, price_currency: 'EUR', price_checked_at: '2026-11-02', free_shipping: true, affiliate_url: 'https://s.click.aliexpress.com/e/_fr', aliexpress_id: '1005010428515910', commission_rate: 0.07, category_id: 'cat-tech', video_url: null, images: [] });
    expect(row.faq).toHaveLength(6);
    const uk = buildProductRow({ candidate: cand(), offer: { market: 'uk', itemId: 'x', detail: detail('uk') }, text, today: '2026-11-02', categoryId: null, slug: 's' });
    expect(uk.free_shipping).toBe(false);
  });
});

describe('notify', () => {
  it('renderEmail : trois cas, échappement HTML', () => {
    const products = [{ market: 'fr', name: 'A <b>', slug: 'a', price: 10, currency: 'EUR', commission_rate: 0.07 }];
    const ready = renderEmail({ kind: 'ready', candidate: { name: 'Prod', aliexpress_id: '1' }, products, photos: 3, publishAt: new Date('2026-11-03T10:00:00Z') });
    expect(ready.subject).toBe('[Tendpick] Fiche prête : Prod');
    expect(ready.html).toContain('A &lt;b&gt;');
    expect(ready.html).toContain('NON dans la page Tendance');
    expect(renderEmail({ kind: 'ready', candidate: { name: 'P', aliexpress_id: '1' }, products, holdReason: 'jouet : vérifier CE' }).html).toContain('jouet : vérifier CE');
    expect(renderEmail({ kind: 'problem', candidate: { name: 'P', aliexpress_id: '1' }, error: 'boom' }).html).toContain('boom');
    expect(renderEmail({ kind: 'live', candidate: { name: 'P', aliexpress_id: '1' }, products }).subject).toContain('En ligne');
  });
  it('sendMail : Brevo, sans clé ni exception', async () => {
    let sent: any = null;
    const fetchImpl = async (_u: string, init: any) => { sent = JSON.parse(init.body); return new Response('{}', { status: 201 }); };
    const r = await sendMail({ subject: 's', html: 'h' }, { apiKey: 'k', fetchImpl: fetchImpl as any });
    expect(r.ok).toBe(true);
    expect(sent.to[0].email).toBe('onepagefactory.pro@gmail.com');
    expect((await sendMail({ subject: 's', html: 'h' }, { apiKey: '' })).ok).toBe(false);
    expect((await sendMail({ subject: 's', html: 'h' }, { apiKey: 'k', fetchImpl: (async () => { throw new Error('réseau'); }) as any })).ok).toBe(false);
  });
});

describe('worker', () => {
  it('OUI → fiches brouillon FR+ES (UK introuvable), photos, prêt à +24 h, puis mise en ligne', async () => {
    const t = tables();
    const { d, clock, mails, offers } = makeDeps(t);
    offers.uk = null;
    const r = await runOnce(d);
    expect(r.prepared[0].outcome).toBe('ready');
    const c = t.trend_candidates[0];
    expect(c.status).toBe('ready');
    expect(c.publish_at).toBe('2026-11-03T10:00:00.000Z');
    expect(c.product_ids).toHaveLength(2);
    expect(t.products.map((p) => p.market).sort()).toEqual(['es', 'fr']);
    expect(t.products.every((p) => p.active === false && p.images.length === 3 && p.image_url === 'products/ae-x-1')).toBe(true);
    const fr = t.products.find((p) => p.market === 'fr');
    const es = t.products.find((p) => p.market === 'es');
    expect(fr.source_product_ref ?? null).toBeNull();
    expect(es.source_product_ref).toBe(fr.id);
    expect(mails[0]).toMatchObject({ kind: 'ready' });
    expect(mails[0].skipped[0].market).toBe('uk');

    // avant l'heure : rien ne se publie
    expect((await publishDue(d)).length).toBe(0);
    expect(t.products.some((p) => p.active)).toBe(false);

    // après 24 h : prix périmé → revérifié, puis mise en ligne
    clock.t = new Date('2026-11-03T10:05:00Z');
    const pub = await publishDue(d);
    expect(pub[0].outcome).toBe('live');
    expect(t.products.every((p) => p.active)).toBe(true);
    expect(fr.price_checked_at).toBe('2026-11-03');
    expect(c.status).toBe('live');
    expect(mails.at(-1).kind).toBe('live');
  });

  it('2e produit : mise en ligne immédiate une fois qu\'un produit du flux est déjà en ligne', async () => {
    const t = tables([cand({ id: 'old', aliexpress_id: '9', status: 'live' }), cand({ id: 'c2', aliexpress_id: '1005010428515910' })]);
    const { d } = makeDeps(t);
    await runOnce(d, { publish: false });
    expect(t.trend_candidates[1].publish_at).toBe('2026-11-02T10:00:00.000Z');
    const pub = await publishDue(d);
    expect(pub[0].outcome).toBe('live');
  });

  it('produit pour enfant : jamais de mise en ligne automatique', async () => {
    const t = tables([cand({ category_slug: 'puericulture' })]);
    t.categories.push({ id: 'cat-bebe', slug: 'puericulture' });
    const { d, clock, mails } = makeDeps(t);
    await runOnce(d);
    expect(t.trend_candidates[0]).toMatchObject({ status: 'ready', publish_at: null });
    expect(t.trend_candidates[0].hold_reason).toContain('CE');
    clock.t = new Date('2026-12-01T00:00:00Z');
    expect((await publishDue(d)).length).toBe(0);
    expect(t.products.some((p) => p.active)).toBe(false);
    expect(mails[0].holdReason).toContain('CE');
  });

  it('photos insuffisantes : fiches en brouillon, produit en erreur, email', async () => {
    const t = tables();
    const { d, mails } = makeDeps(t, { photos: async () => { throw new Error('seulement 1 photo(s) exploitable(s)'); } });
    const r = await runOnce(d);
    expect(r.prepared[0].outcome).toBe('error');
    expect(t.trend_candidates[0]).toMatchObject({ status: 'error', photos_status: 'error' });
    expect(t.trend_candidates[0].error).toContain('photos');
    expect(t.products.every((p) => !p.active)).toBe(true);
    expect(mails[0]).toMatchObject({ kind: 'problem' });
  });

  it('erreur API passagère : remise en file, puis échec après 3 essais ; note trop basse refusée', async () => {
    const t = tables();
    const { d, mails } = makeDeps(t, { api: { getProduct: async () => { throw new Error('ApiCallLimit'); }, verify: async () => ({ ok: true, checks: [] }) } });
    await runOnce(d);
    expect(t.trend_candidates[0]).toMatchObject({ status: 'validated' });
    expect(t.trend_candidates[0].pipeline_log.attempts).toBe(1);
    await runOnce(d);
    await runOnce(d);
    expect(t.trend_candidates[0].status).toBe('error');
    expect(mails).toHaveLength(1);

    const t2 = tables([cand({ rating: 3.2 })]);
    const m2 = makeDeps(t2);
    await runOnce(m2.d);
    expect(t2.trend_candidates[0].status).toBe('error');
    expect(t2.trend_candidates[0].error).toContain('minimum 4');
    expect(t2.products).toHaveLength(0);
  });

  it('relance : réutilise les fiches existantes sans réécrire les textes', async () => {
    const t = tables();
    const { d } = makeDeps(t);
    await runOnce(d, { publish: false });
    const before = t.products.map((p) => p.slug);
    Object.assign(t.trend_candidates[0], { status: 'validated' });
    let llmCalls = 0;
    d.llm = async (p: string) => { llmCalls++; return llmOk(p); };
    await runOnce(d, { publish: false });
    expect(llmCalls).toBe(0);
    expect(t.products.map((p) => p.slug)).toEqual(before);
  });

  it('verrou oublié : un produit « en cours » depuis plus de 30 min est repris', async () => {
    const t = tables([cand({ status: 'in_progress', updated_at: '2026-11-02T09:00:00.000Z' })]);
    const { d, logs } = makeDeps(t);
    await runOnce(d, { publish: false });
    expect(logs.join('\n')).toContain('repris');
    expect(t.trend_candidates[0].status).toBe('ready');
  });

  it('mise en ligne bloquée : prix qui a trop bougé après 24 h → rien d\'activé, email', async () => {
    const t = tables();
    const { d, clock, mails } = makeDeps(t);
    await runOnce(d);
    clock.t = new Date('2026-11-03T10:05:00Z');
    d.api = { getProduct: async (_i: string, m: string) => detail(m), verify: async () => ({ ok: false, checks: [{ name: 'prix', ok: false, detail: 'écart 40 %' }] }) };
    const pub = await publishDue(d);
    expect(pub[0].outcome).toBe('blocked');
    expect(t.products.some((p) => p.active)).toBe(false);
    expect(t.trend_candidates[0].status).toBe('error');
    expect(mails.at(-1).kind).toBe('problem');
  });
});

describe('worker : vidéo, livraison et photos refaites', () => {
  it('vidéo trouvée pour FR, absente pour ES : rappel dans l\'email ; livraison gratuite à cocher si non détectée', async () => {
    const t = tables();
    const { d, mails, offers } = makeDeps(t, {
      video: async ({ market }: any) => (market === 'fr' ? { url: 'https://www.youtube.com/watch?v=abc', title: 'Test', channel: 'Chaîne' } : null),
    });
    offers.uk = null;
    await runOnce(d, { publish: false });
    const fr = t.products.find((p) => p.market === 'fr');
    const es = t.products.find((p) => p.market === 'es');
    expect(fr.video_url).toBe('https://www.youtube.com/watch?v=abc');
    expect(es.video_url ?? null).toBeNull();
    const w: string[] = mails[0].warnings;
    expect(w.some((x) => x.startsWith('Vidéo ES'))).toBe(true);
    expect(w.some((x) => x.startsWith('Vidéo FR'))).toBe(false);
    expect(w.some((x) => x.includes('Livraison gratuite non détectée'))).toBe(false); // FR et ES : « Oui » dans la recherche
  });

  it('erreur YouTube : jamais bloquante ; sans clé : le dit dans l\'email', async () => {
    const t = tables();
    const { d, mails, offers } = makeDeps(t, { video: async () => { throw new Error('YouTube 403'); } });
    offers.uk = null;
    const r = await runOnce(d, { publish: false });
    expect(r.prepared[0].outcome).toBe('ready');
    expect(mails[0].warnings.some((x: string) => x.includes('YouTube 403'))).toBe(true);

    const t2 = tables();
    const m2 = makeDeps(t2);
    m2.offers.uk = null;
    await runOnce(m2.d, { publish: false });
    expect(m2.mails[0].warnings.some((x: string) => x.includes('YOUTUBE_API_KEY'))).toBe(true);
  });

  it('--redo-photos : refait le tri d\'un produit déjà prêt et remplace les photos des fiches', async () => {
    const t = tables();
    const { d, offers } = makeDeps(t);
    offers.uk = null;
    await runOnce(d, { publish: false });
    expect(t.trend_candidates[0].status).toBe('ready');
    // sans l'option, un produit prêt n'est pas retraité
    const idle = await runOnce(d, { id: '1005010428515910', publish: false });
    expect(idle.prepared.length).toBe(0);

    let calls = 0;
    d.photos = async () => { calls++; return { photos: [7, 8, 9, 10].map((i) => ({ public_id: `products/new-${i}` })), report: { warnings: [] } }; };
    const r = await runOnce(d, { id: '1005010428515910', publish: false, redoPhotos: true });
    expect(calls).toBe(1);
    expect(r.prepared[0].outcome).toBe('ready');
    expect(t.trend_candidates[0].status).toBe('ready');
    expect(t.products.every((p) => p.images.length === 4 && p.image_url === 'products/new-7')).toBe(true);
  });
});
