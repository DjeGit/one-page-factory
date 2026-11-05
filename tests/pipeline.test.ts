import { describe, it, expect } from 'vitest';
// @ts-ignore — modules Node purs (.mjs)
import { checkCandidate, computePublishAt, isPriceStale, parseFreeShipping, publishIssues, needsManualReview, priceGap, shippingState, parseShippingValue, MIN_PHOTOS } from '../scripts/pipeline/gates.mjs';
// @ts-ignore
import { collectOffers, itemIdFor } from '../scripts/pipeline/offers.mjs';
// @ts-ignore
import { validateFicheText, generateFicheText, buildPrompt, fit, fixedFaq, longDate, callClaude, textProvider, callText } from '../scripts/pipeline/fiche-text.mjs';
// @ts-ignore
import { extractSpecs, formatSpecs } from '../scripts/pipeline/specs.mjs';
// @ts-ignore
import { slugify, uniqueSlug, buildProductRow } from '../scripts/pipeline/fiches.mjs';
// @ts-ignore
import { renderEmail, sendMail } from '../scripts/pipeline/notify.mjs';
// @ts-ignore
import { runOnce, publishDue, isTransient, isDailyQuota, finalReport } from '../scripts/pipeline/worker.mjs';
// @ts-ignore
import { redact } from '../scripts/pipeline/safe.mjs';
// @ts-ignore
import { photoStats, describePhotos, summaryLines } from '../scripts/pipeline/report.mjs';

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
    expect(checkCandidate({ rating: 4.5, aliexpress_id: '1005010428515910' })).toEqual([]);
    expect(checkCandidate({ rating: 3.9, aliexpress_id: '1005010428515910' })[0]).toContain('minimum 4');
    expect(checkCandidate({ rating: null, aliexpress_id: '1005010428515910' })[0]).toContain('absente');
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

  it('photos à compléter : les bonnes photos sont jointes aux brouillons, produit en erreur avec un message clair', async () => {
    const t = tables();
    const { d, mails, logs } = makeDeps(t, { photos: async () => { throw Object.assign(new Error('seulement 2 photo(s) exploitable(s) (minimum 3)'), { detail: '#0 ok …', partial: { photos: [1, 2].map((i) => ({ public_id: `products/ae-p-${i}` })), report: {} } }); } });
    const r = await runOnce(d);
    expect(r.prepared[0].outcome).toBe('error');
    const c = t.trend_candidates[0];
    expect(c).toMatchObject({ status: 'error', photos_status: 'review' });
    expect(c.error).toContain('photos à compléter : 2 sur 3');
    expect(c.error).not.toContain('#0');
    expect(t.products.length).toBeGreaterThan(0);
    expect(t.products.every((p) => !p.active && p.images.length === 2 && p.image_url === 'products/ae-p-1')).toBe(true);
    expect(mails[0]).toMatchObject({ kind: 'problem' });
    expect(logs.join('\n')).toContain('jointe');
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
    expect(w.some((x) => x.includes('Livraison gratuite non relevée'))).toBe(false); // FR et ES : « Oui » dans la recherche
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

  it('Gemini surchargé pendant le tri des photos : remise en file (pas d\'échec), puis les nouvelles photos remplacent les anciennes', async () => {
    const t = tables();
    const { d, mails, offers } = makeDeps(t);
    offers.uk = null;
    await runOnce(d, { publish: false });
    expect(t.products.every((p) => p.image_url === 'products/ae-x-1')).toBe(true);

    d.photos = async () => { throw new Error('Gemini 503 : This model is currently experiencing high demand.'); };
    const r1 = await runOnce(d, { id: '1005010428515910', publish: false, redoPhotos: true });
    expect(r1.prepared[0].outcome).toBe('retry');
    expect(t.trend_candidates[0].status).toBe('validated');
    expect(mails.some((m: any) => m.kind === 'problem')).toBe(false);

    // la tâche suivante (sans option) retraite le produit et remplace les photos
    d.photos = async () => ({ photos: [5, 6, 7].map((i) => ({ public_id: `products/new-${i}` })), report: { warnings: [] } });
    const r2 = await runOnce(d, { publish: false });
    expect(r2.prepared[0].outcome).toBe('ready');
    expect(t.products.every((p) => p.image_url === 'products/new-5' && p.images.length === 3)).toBe(true);
  });
});


// ─── Robustesse : garde-fous, doubles exécutions, reprises, secrets ─────────
const readyRun = async (over: any = {}, candOver: any = {}) => {
  const t = tables([cand(candOver)]);
  const m = makeDeps(t, over);
  m.offers.uk = null;
  await runOnce(m.d, { publish: false });
  return { t, ...m };
};

describe('gates : durcissement', () => {
  it('livraison gratuite : seule une réponse nette compte (jamais « gratuite » à tort)', () => {
    for (const v of ['Oui', 'oui', 'Yes', 'Sí', '1', 'Gratuite', 'Free shipping']) expect(parseFreeShipping(v)).toBe(true);
    for (const v of ['Non', 'No', '0', 'Sin envío gratuito', 'Oui dès 20 €', 'Free over £30', 'Siempre', '', null, undefined]) expect(parseFreeShipping(v)).toBe(false);
    expect(parseShippingValue('Oui dès 20 €')).toBeNull();
    expect(shippingState('Oui', true)).toBe('free');
    expect(shippingState('Non', false)).toBe('paid');
    expect(shippingState(null, false)).toBe('unknown');
    expect(shippingState('Oui dès 20 €', false)).toBe('unknown');
  });
  it('checkCandidate : note illisible et identifiant invalide refusés', () => {
    expect(checkCandidate({ rating: 'abc', aliexpress_id: '1005010428515910' })[0]).toContain('illisible');
    expect(checkCandidate({ rating: 4.5, aliexpress_id: '10; DROP TABLE' })[0]).toContain('invalide');
    expect(checkCandidate({ rating: 4.5, aliexpress_id: '' })[0]).toContain('manquant');
  });
  it('produits pour enfants : catégorie OU mots du nom, même rangés en Tech', () => {
    expect(needsManualReview('tech', 'Montre GPS enfant', null)).toContain('enfant');
    expect(needsManualReview('maison-deco', 'Veilleuse bébé')).toContain('CE');
    expect(needsManualReview('loisirs', 'Juguete educativo')).toContain('CE');
    expect(needsManualReview('tech', 'Garmin Forerunner 165', 'montre GPS')).toBeNull();
    expect(needsManualReview('puericulture', 'Poussette')).toContain('bébé');
  });
  it('publishIssues strict : photos minimum, lien AliExpress en https, prix du jour', () => {
    const now = new Date('2026-11-02T10:00:00Z');
    const good = { affiliate_url: 'https://s.click.aliexpress.com/e/_a', images: ['a', 'b', 'c'], image_url: 'a', price: 10, price_checked_at: '2026-11-02' };
    const strict = { minPhotos: MIN_PHOTOS, aliexpressOnly: true, now };
    expect(publishIssues(good, strict)).toEqual([]);
    expect(publishIssues({ ...good, images: ['a', 'b'] }, strict)[0]).toContain('seulement 2 photo');
    expect(publishIssues({ ...good, affiliate_url: 'https://exemple.com/x' }, strict)[0]).toContain('AliExpress');
    expect(publishIssues({ ...good, affiliate_url: 'http://s.click.aliexpress.com/e/_a' }, strict)[0]).toContain('AliExpress');
    expect(publishIssues({ ...good, price_checked_at: '2026-10-30' }, strict)[0]).toContain('revérifier');
    expect(publishIssues({ ...good, price: 0 }, strict)[0]).toContain('prix');
    expect(publishIssues({ ...good, images: ['a'] }, {})).toEqual([]); // règle d'activation à la main inchangée
  });
});

describe('offers : contrôles indépendants de verify()', () => {
  const okVerify = async () => ({ ok: true, checks: [] });
  it('écart de prix > 20 % : bloqué même si la vérification du lien répond ok', async () => {
    const r = await collectOffers(cand({ price_fr: 100 }), { getProduct: async () => detail('fr', { price: 130 }), verify: okVerify }, ['fr']);
    expect(r[0].status).toBe('blocked');
    expect(r[0].reasons[0]).toContain('30 %');
    const edge = await collectOffers(cand({ price_fr: 100 }), { getProduct: async () => detail('fr', { price: 120 }), verify: okVerify }, ['fr']);
    expect(edge[0].status).toBe('ok'); // 20 % pile : accepté
  });
  it('sans prix de référence : on ne devine pas', async () => {
    const r = await collectOffers(cand({ price_es: null }), { getProduct: async () => detail('es'), verify: okVerify }, ['es']);
    expect(r[0]).toMatchObject({ status: 'blocked' });
    expect(r[0].reasons[0]).toContain('prix de référence');
  });
  it('lien neutre, hors AliExpress ou mauvaise devise : bloqué', async () => {
    const neutral = await collectOffers(cand(), { getProduct: async () => detail('fr', { promotionLink: 'https://www.aliexpress.com/item/1005010428515910.html' }), verify: okVerify }, ['fr']);
    expect(neutral[0].status).toBe('blocked');
    const foreign = await collectOffers(cand(), { getProduct: async () => detail('fr', { promotionLink: 'https://exemple.com/x' }), verify: okVerify }, ['fr']);
    expect(foreign[0].status).toBe('blocked');
    const gbp = await collectOffers(cand(), { getProduct: async () => detail('fr', { currency: 'GBP' }), verify: okVerify }, ['fr']);
    expect(gbp[0].reasons[0]).toContain('devise');
  });
});

describe('worker : double exécution et reprise après coupure', () => {
  it('relancer deux fois ne crée ni fiche, ni slug, ni email en double', async () => {
    const t = tables();
    const { d, mails, offers } = makeDeps(t);
    offers.uk = null;
    await runOnce(d, { publish: false });
    const snapshot = JSON.stringify(t.products.map((p) => [p.id, p.slug, p.market]));
    const again = await runOnce(d, { publish: false });
    expect(again.prepared).toHaveLength(0);
    expect(JSON.stringify(t.products.map((p) => [p.id, p.slug, p.market]))).toBe(snapshot);
    expect(mails.filter((m) => m.kind === 'ready')).toHaveLength(1);

    // même après un nouveau OUI : les fiches sont retrouvées, pas recréées, et les slugs restent uniques
    Object.assign(t.trend_candidates[0], { status: 'validated', decided_at: '2026-11-02T12:00:00Z' });
    await runOnce(d, { publish: false });
    expect(t.products).toHaveLength(2);
    expect(new Set(t.products.map((p) => p.slug)).size).toBe(2);
  });

  it('deux produits au même nom : slugs distincts', async () => {
    const t = tables([cand(), cand({ id: 'c2', aliexpress_id: '1005099999999999', url_fr: 'https://www.aliexpress.com/item/1005099999999999.html', url_uk: null, price_uk: null })]);
    const { d, offers } = makeDeps(t);
    offers.uk = null;
    await runOnce(d, { publish: false });
    expect(t.products).toHaveLength(4);
    expect(new Set(t.products.map((p) => p.slug)).size).toBe(4);
  });

  it('Gemini surchargé pendant la rédaction du 2e marché : remise en file, la reprise ne réécrit pas le 1er texte', async () => {
    const t = tables();
    let llmCalls: string[] = [];
    let boom = true;
    const { d, mails, offers } = makeDeps(t, {
      llm: async (p: string) => {
        llmCalls.push(p.includes('espagnol') ? 'es' : p.includes('anglais') ? 'en' : 'fr');
        if (boom && p.includes('espagnol')) throw new Error('Gemini 503 : This model is currently experiencing high demand.');
        return llmOk(p);
      },
    });
    offers.uk = null;
    const r1 = await runOnce(d, { publish: false });
    expect(r1.prepared[0].outcome).toBe('retry');
    expect(t.trend_candidates[0].status).toBe('validated');
    expect(t.products.map((p) => p.market)).toEqual(['fr']);
    expect(mails).toHaveLength(0);

    boom = false;
    llmCalls = [];
    const r2 = await runOnce(d, { publish: false });
    expect(r2.prepared[0].outcome).toBe('ready');
    expect(llmCalls).toEqual(['es']); // le texte FR n'est pas réécrit
    expect(t.products.map((p) => p.market).sort()).toEqual(['es', 'fr']);
    expect(mails.filter((m) => m.kind === 'ready')).toHaveLength(1);
  });

  it('erreur définitive du texte (clé absente) : échec tout de suite, pas de nouvel essai', async () => {
    const { t, mails } = await readyRun({ llm: async () => { throw new Error('GEMINI_API_KEY absente'); } });
    expect(t.trend_candidates[0].status).toBe('error');
    expect(mails[0].kind).toBe('problem');
  });

  it('coupure après la création des fiches (photos en panne définitive) : un nouveau OUI réutilise les fiches', async () => {
    const t = tables();
    const { d, offers } = makeDeps(t, { photos: async () => { throw new Error('seulement 1 photo(s) exploitable(s)'); } });
    offers.uk = null;
    await runOnce(d);
    expect(t.trend_candidates[0].status).toBe('error');
    const ids = t.products.map((p) => p.id);
    d.photos = async () => ({ photos: [1, 2, 3].map((i) => ({ public_id: `products/ae-y-${i}` })), report: { warnings: [] } });
    Object.assign(t.trend_candidates[0], { status: 'validated', decided_at: '2026-11-02T12:00:00Z' }); // clic sur OUI dans l'admin
    const r = await runOnce(d, { publish: false });
    expect(r.prepared[0].outcome).toBe('ready');
    expect(t.products.map((p) => p.id)).toEqual(ids);
    expect(t.products.every((p) => p.image_url === 'products/ae-y-1')).toBe(true);
  });

  it('compteur d’essais : repart de zéro après un nouveau clic sur OUI', async () => {
    const api = { getProduct: async () => { throw new Error('ApiCallLimit'); }, verify: async () => ({ ok: true, checks: [] }) };
    const t = tables([cand({ pipeline_log: { attempts: 2, decided_at: '2026-10-01T00:00:00Z' } })]); // ancienne décision
    const { d } = makeDeps(t, { api });
    await runOnce(d);
    expect(t.trend_candidates[0].status).toBe('validated'); // 1er essai de la nouvelle décision, pas un échec
    expect(t.trend_candidates[0].pipeline_log.attempts).toBe(1);
    const t2 = tables([cand({ pipeline_log: { attempts: 2, decided_at: '2026-11-02T08:00:00Z' } })]); // même décision
    await runOnce(makeDeps(t2, { api }).d);
    expect(t2.trend_candidates[0].status).toBe('error');
  });

  it('verrou périmé : repris deux fois, puis en erreur à la 3e (arrêt brutal à répétition), avec un seul email', async () => {
    const stale = (attempts: number) => cand({ status: 'in_progress', updated_at: '2026-11-02T09:00:00.000Z', pipeline_log: { attempts, decided_at: '2026-11-02T08:00:00Z' } });
    const t = tables([stale(1)]);
    const { d, mails, logs } = makeDeps(t);
    await runOnce(d, { publish: false });
    expect(t.trend_candidates[0].status).toBe('ready'); // repris puis traité
    expect(logs.join('\n')).toContain('repris après une interruption');

    const t2 = tables([stale(2)]);
    const m2 = makeDeps(t2);
    await runOnce(m2.d, { publish: false });
    expect(t2.trend_candidates[0].status).toBe('error');
    expect(t2.trend_candidates[0].error).toContain('interrompu');
    expect(t2.products).toHaveLength(0);
    expect(m2.mails.filter((m: any) => m.kind === 'problem')).toHaveLength(1);
    expect(mails.filter((m: any) => m.kind === 'problem')).toHaveLength(0);
  });

  it('un verrou récent (moins de 30 min) n’est jamais volé', async () => {
    const t = tables([cand({ status: 'in_progress', updated_at: '2026-11-02T09:45:00.000Z' })]);
    const { d } = makeDeps(t);
    await runOnce(d, { publish: false });
    expect(t.trend_candidates[0].status).toBe('in_progress');
    expect(t.products).toHaveLength(0);
  });

  it('NON cliqué pendant le traitement : le produit n’est pas écrasé en « prêt » et aucun email ne part', async () => {
    const t = tables();
    const { d, mails } = makeDeps(t, {
      photos: async () => {
        Object.assign(t.trend_candidates[0], { status: 'candidate', decision: 'no' }); // Jerome a changé d'avis entre-temps
        return { photos: [1, 2, 3].map((i) => ({ public_id: `products/ae-x-${i}` })), report: { warnings: [] } };
      },
    });
    const r = await runOnce(d, { publish: false });
    expect(r.prepared[0].outcome).toBe('skipped');
    expect(t.trend_candidates[0].status).toBe('candidate');
    expect(mails).toHaveLength(0);
  });

  it('une exception inattendue sur un produit n’empêche pas de traiter le suivant', async () => {
    const t = tables([cand({ id: 'a', aliexpress_id: '1005000000000001', url_fr: null, url_uk: null }), cand({ id: 'b', aliexpress_id: '1005000000000002', url_fr: null, url_uk: null })]);
    let first = true;
    const { d } = makeDeps(t, {
      api: { getProduct: async (_i: string, m: string) => { if (first) { first = false; throw new TypeError('bug'); } return detail(m); }, verify: async () => ({ ok: true, checks: [] }) },
    });
    const r = await runOnce(d, { publish: false });
    expect(r.prepared.map((x: any) => x.outcome)).toEqual(['retry', 'ready']);
  });
});

describe('worker : erreurs, journal et secrets', () => {
  it('quota journalier Gemini : produit remis en file sans consommer d’essai, passage arrêté, pas d’email', async () => {
    const t = tables();
    t.trend_candidates.push({ ...t.trend_candidates[0], id: 'c2', aliexpress_id: '1005000000002', decided_at: '2026-11-02T08:01:00Z' });
    let calls = 0;
    const { d, mails } = makeDeps(t, { llm: async () => { calls++; throw new Error('Gemini 429: You exceeded your current quota. Generate Content requests per day limit exceeded on Free Tier. Please retry in 14h54m'); } });
    const r = await runOnce(d);
    expect(r.prepared).toHaveLength(1);
    expect(r.prepared[0].outcome).toBe('quota');
    expect(t.trend_candidates[0]).toMatchObject({ status: 'validated' });
    expect(t.trend_candidates[0].pipeline_log?.attempts ?? 0).toBe(0);
    expect(t.trend_candidates[1].status).toBe('validated');
    expect(mails).toHaveLength(0);
  });

  it('callClaude : appelle l’API Messages avec Sonnet 5.5 et lit le texte de la réponse', async () => {
    let seen: any;
    const fetchImpl = async (url: string, init: any) => {
      seen = { url, init, body: JSON.parse(init.body) };
      return { ok: true, json: async () => ({ content: [{ type: 'text', text: '{"a":' }, { type: 'text', text: '1}' }] }) } as any;
    };
    const out = await callClaude('bonjour', { key: 'sk-test', fetchImpl: fetchImpl as any });
    expect(out).toBe('{"a":1}');
    expect(seen.url).toBe('https://api.anthropic.com/v1/messages');
    expect(seen.init.headers['x-api-key']).toBe('sk-test');
    expect(seen.body.model).toBe('claude-sonnet-5-5');
    expect(seen.body.messages).toEqual([{ role: 'user', content: 'bonjour' }]);
  });

  it('callClaude : erreur Anthropic remontée avec son code, clé absente refusée', async () => {
    const fetchImpl = async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'Your credit balance is too low to access the Anthropic API.' } }) }) as any;
    await expect(callClaude('x', { key: 'k', fetchImpl: fetchImpl as any })).rejects.toThrow('Anthropic 400 : Your credit balance is too low');
    await expect(callClaude('x', { key: '' })).rejects.toThrow('ANTHROPIC_API_KEY absente');
  });

  it('textProvider : Claude dès que la clé Anthropic existe, Gemini sinon, forçage possible', () => {
    expect(textProvider({ ANTHROPIC_API_KEY: 'a', GEMINI_API_KEY: 'g' })).toBe('claude');
    expect(textProvider({ GEMINI_API_KEY: 'g' })).toBe('gemini');
    expect(textProvider({ ANTHROPIC_API_KEY: 'a', GEMINI_API_KEY: 'g', TEXT_AI_PROVIDER: 'gemini' })).toBe('gemini');
    expect(textProvider({ ANTHROPIC_API_KEY: 'a', TEXT_AI_PROVIDER: 'gemini' })).toBe('claude');
    expect(textProvider({})).toBe('none');
    expect(() => callText('x', { provider: 'none' })).toThrow('aucune clé IA');
  });

  it('isDailyQuota : crédit Anthropic épuisé ou plafond de dépense atteint = pause, pas un échec', () => {
    expect(isDailyQuota('Anthropic 400 : Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing')).toBe(true);
    expect(isDailyQuota('Anthropic 400 : You have reached your specified API usage limits. You will regain access on 2026-12-01 at 00:00 UTC.')).toBe(true);
    expect(isDailyQuota('Anthropic 429 : rate_limit_error, retry later')).toBe(false);
    expect(isDailyQuota('Anthropic 401 : invalid x-api-key')).toBe(false);
    expect(isTransient('Anthropic 429 : rate limit')).toBe(true);
  });

  it('isDailyQuota : seulement le quota du jour', () => {
    expect(isDailyQuota('Gemini 429: … requests per day limit exceeded on Free Tier. Please retry in 14h54m')).toBe(true);
    expect(isDailyQuota('Gemini 429 : trop de requêtes par minute')).toBe(false);
    expect(isDailyQuota('Gemini 503 : high demand')).toBe(false);
  });

  it('isTransient : surcharge et réseau oui, erreurs définitives non', () => {
    for (const m of ['Gemini 503 : high demand', 'Gemini 429 : quota', 'Anthropic 529 : overloaded', 'fetch failed', 'The operation was aborted due to timeout', 'tri photos illisible : JSON invalide', 'Cloudinary : 502', 'HTTP 503']) expect(isTransient(m)).toBe(true);
    for (const m of ['Gemini 400 : API key not valid', 'GEMINI_API_KEY absente', 'seulement 1 photo(s) exploitable(s)', 'texte fr refusé après 2 essais : …', 'Cloudinary : Invalid Signature']) expect(isTransient(m)).toBe(false);
  });

  it('aucun secret dans le journal, la base ni les emails', async () => {
    const SECRET = 'AIzaSyD-abcdefghijklmnopqrstuvwxyz12345';
    const t = tables();
    const { d, mails, logs } = makeDeps(t, { photos: async () => { throw new Error(`Gemini 400 : https://generativelanguage.googleapis.com/x?key=${SECRET} refusée`); } });
    await runOnce(d);
    const everything = JSON.stringify([t.trend_candidates, mails, logs]);
    expect(everything).not.toContain(SECRET);
    expect(t.trend_candidates[0].error).toContain('[masqué]');
    expect(redact('Bearer abcdefghijklmnop et sk-ant-api03-abcdefghijklmnopqrstuvwx')).not.toMatch(/abcdefghijklmnop/);
    expect(redact('MA_VALEUR_SECRETE_123', { SOME_API_KEY: 'MA_VALEUR_SECRETE_123' })).toBe('[masqué]');
    expect(redact('ok')).toBe('ok');
  });

  it('un email refusé par Brevo est signalé dans le journal sans bloquer le flux', async () => {
    const { logs, t } = await readyRun({ mail: async () => ({ ok: false, status: 401, error: 'Brevo a répondu 401' }) });
    expect(t.trend_candidates[0].status).toBe('ready');
    expect(logs.join('\n')).toContain('email non envoyé : Brevo a répondu 401');
  });

  it('journal lisible : marchés, photos retenues/écartées, vidéo, livraison, date de mise en ligne', async () => {
    const report = { fetched: 12, tooSmall: 1, duplicates: 2, failed: [], rejected: [{ note: 'promo' }, { note: 'doublon visuel' }, { note: 'texte' }, { note: 'emballage' }, { note: 'flou' }] };
    const { logs, mails } = await readyRun({
      photos: async () => ({ photos: [1, 2, 3, 4, 5].map((i) => ({ public_id: `products/ae-x-${i}` })), report }),
      video: async ({ market }: any) => (market === 'fr' ? { url: 'https://www.youtube.com/watch?v=abc', title: 'Test', channel: 'C' } : null),
    }, { free_shipping_es: null });
    const log = logs.join('\n');
    expect(log).toContain('Marché FR : disponible');
    expect(log).toContain('Marché UK : indisponible');
    expect(log).toContain('Marchés prêts : FR, ES');
    expect(log).toContain('Marchés indisponibles : UK');
    expect(log).toContain('Photos : 5 retenue(s) sur 12 téléchargée(s), 7 écartée(s) (4 refusée(s) par le tri');
    expect(log).toContain('Vidéo : FR trouvée, ES aucune vidéo fiable');
    expect(log).toContain('Livraison gratuite : FR gratuite, ES à vérifier');
    expect(log).toContain('Mise en ligne prévue : mardi 3 novembre 2026 à 11:00 (heure de Madrid)');
    expect(mails[0].summary.some((l: string) => l.startsWith('Photos : 5 retenue(s)'))).toBe(true);
    expect(mails[0].warnings.some((w: string) => w.startsWith('Livraison gratuite non relevée (ES)'))).toBe(true);
  });

  it('report : photoStats, summaryLines (hold manuel) et bilan final', () => {
    expect(describePhotos(photoStats(undefined, 3))).toBe('3 retenue(s)');
    const lines = summaryLines({ offers: [{ market: 'fr', status: 'ok', reasons: [] }], photos: null, videos: {}, shipping: {}, publishAt: null, hold: 'jouet : vérifier CE' });
    expect(lines).toContain('Mise en ligne : manuelle (jouet : vérifier CE)');
    expect(finalReport({ prepared: [], published: [] })).toBe('');
    expect(finalReport({ prepared: [{ id: '1', name: 'Garmin', outcome: 'ready' }], published: [{ id: '2', name: 'Shokz', outcome: 'live' }] })).toContain('Shokz : mis en ligne');
  });

  it('--id sans rien à faire : le journal explique pourquoi', async () => {
    const t = tables([cand({ status: 'live' })]);
    const { d, logs } = makeDeps(t);
    await runOnce(d, { id: '1005010428515910' });
    expect(logs.join('\n')).toContain('Rien à faire pour 1005010428515910');
  });

  it('emails : contenu sans secret, résumé présent, plus de mention obsolète sur la vidéo', () => {
    const html = renderEmail({ kind: 'ready', candidate: { name: 'P', aliexpress_id: '1' }, products: [{ market: 'fr', name: 'A', slug: 'a', price: 10, currency: 'EUR', commission_rate: 0.07 }], photos: 5, publishAt: new Date('2026-11-03T10:00:00Z'), summary: ['Photos : 5 retenue(s)'] }).html;
    expect(html).toContain('Photos : 5 retenue(s)');
    expect(html).not.toContain('sans la vidéo du fabricant');
    expect(html).not.toMatch(/api[-_ ]?key|secret|token/i);
  });
});

describe('worker : mise en ligne, aucun contournement', () => {
  const ready = async (over: any = {}, candOver: any = {}) => {
    const r = await readyRun(over, candOver);
    r.clock.t = new Date('2026-11-03T10:05:00Z'); // 24 h après
    return r;
  };

  it('avant l’heure : rien ; deux passages après l’heure : une seule mise en ligne et un seul email', async () => {
    const { t, d, mails } = await ready();
    d.now = () => new Date('2026-11-03T09:00:00Z');
    expect(await publishDue(d)).toHaveLength(0);
    d.now = () => new Date('2026-11-03T10:05:00Z');
    expect((await publishDue(d))[0].outcome).toBe('live');
    expect(await publishDue(d)).toHaveLength(0);
    expect(mails.filter((m) => m.kind === 'live')).toHaveLength(1);
    expect(t.products.every((p) => p.active)).toBe(true);
  });

  it('catégorie passée en « jouets » après la préparation : la mise en ligne automatique est refusée', async () => {
    const { t, d } = await ready();
    t.trend_candidates[0].category_slug = 'jeux-jouets';
    expect(await publishDue(d)).toHaveLength(0);
    expect(t.products.some((p) => p.active)).toBe(false);
  });

  it('un nom « enfant » rangé en Tech : jamais en ligne automatiquement', async () => {
    const { t, d, mails } = await readyRun({}, { name: 'Montre GPS enfant' });
    expect(t.trend_candidates[0]).toMatchObject({ status: 'ready', publish_at: null });
    expect(t.trend_candidates[0].hold_reason).toContain('enfant');
    d.now = () => new Date('2026-12-01T00:00:00Z');
    expect(await publishDue(d)).toHaveLength(0);
    expect(mails[0].holdReason).toContain('CE');
  });

  it('un produit validé à la main (jouet vérifié) est constaté « en ligne » sans nouvel email', async () => {
    const t = tables([cand({ category_slug: 'jeux-jouets' })]);
    t.categories.push({ id: 'cat-jouets', slug: 'jeux-jouets' });
    const { d, mails, offers } = makeDeps(t);
    offers.uk = null;
    await runOnce(d, { publish: false });
    expect(t.trend_candidates[0].hold_reason).toContain('jouet');
    t.products.forEach((p) => { p.active = true; });
    expect((await publishDue(d))[0].outcome).toBe('live');
    expect(t.trend_candidates[0].status).toBe('live');
    expect(mails.filter((m) => m.kind === 'live')).toHaveLength(0);
  });

  it('note modifiée à la baisse après la préparation : bloqué avec email', async () => {
    const { t, d, mails } = await ready();
    t.trend_candidates[0].rating = 3.1;
    expect((await publishDue(d))[0].outcome).toBe('blocked');
    expect(t.products.some((p) => p.active)).toBe(false);
    expect(t.trend_candidates[0].status).toBe('error');
    expect(mails.at(-1).error).toContain('note 3.1');
  });

  it('photos sous le minimum, lien hors AliExpress : le marché concerné reste en brouillon, l’autre passe', async () => {
    const { t, d, mails } = await ready();
    const es = t.products.find((p) => p.market === 'es');
    es.images = es.images.slice(0, 2);
    const fr = t.products.find((p) => p.market === 'fr');
    expect((await publishDue(d))[0].outcome).toBe('live');
    expect(fr.active).toBe(true);
    expect(es.active).toBe(false);
    expect(mails.at(-1).warnings[0]).toContain('ES resté en brouillon');
    expect(mails.at(-1).warnings[0]).toContain('seulement 2 photo');

    const m2 = await ready();
    const fr2 = m2.t.products.find((p: any) => p.market === 'fr');
    fr2.affiliate_url = 'https://exemple.com/pirate';
    m2.d.api = { getProduct: async () => detail('es'), verify: async () => ({ ok: true, checks: [] }) };
    fr2.price_checked_at = '2026-11-03'; // prix « frais » : pas de revérification, le lien est contrôlé quand même
    await publishDue(m2.d);
    expect(fr2.active).toBe(false);
  });

  it('prix périmé et revérification refusée pour un marché : ce marché n’est pas affiché', async () => {
    const { t, d, mails } = await ready();
    d.api = { getProduct: async (_i: string, m: string) => detail(m, m === 'es' ? { price: 300 } : {}), verify: async () => ({ ok: true, checks: [] }) };
    expect((await publishDue(d))[0].outcome).toBe('live');
    expect(t.products.find((p) => p.market === 'fr').active).toBe(true);
    expect(t.products.find((p) => p.market === 'es').active).toBe(false);
    expect(mails.at(-1).warnings.join()).toContain('écart');
  });

  it('API AliExpress en panne à l’heure de la mise en ligne : reste « prêt », réessai, puis blocage au 3e essai', async () => {
    const { t, d, mails } = await ready();
    d.api = { getProduct: async () => { throw new Error('ApiCallLimit'); }, verify: async () => ({ ok: true, checks: [] }) };
    expect((await publishDue(d))[0].outcome).toBe('retry');
    expect(t.trend_candidates[0].status).toBe('ready');
    expect((await publishDue(d))[0].outcome).toBe('retry');
    expect((await publishDue(d))[0].outcome).toBe('blocked');
    expect(t.trend_candidates[0].status).toBe('error');
    expect(mails.filter((m) => m.kind === 'problem')).toHaveLength(1);
    expect(t.products.some((p) => p.active)).toBe(false);
  });

  it('fiches supprimées entre-temps : signalé une fois, rien de publié', async () => {
    const { t, d, mails } = await ready();
    t.products.length = 0;
    expect((await publishDue(d))[0].outcome).toBe('blocked');
    expect(mails.filter((m) => m.kind === 'problem')).toHaveLength(1);
    expect(await publishDue(d)).toHaveLength(0);
  });

  it('coupure en pleine activation (FR déjà actif, ES pas encore) : la reprise termine sans tout bloquer', async () => {
    const { t, d } = await ready();
    t.products.find((p) => p.market === 'fr').active = true;
    d.api = { getProduct: async (_i: string, m: string) => detail(m), verify: async () => ({ ok: true, checks: [] }) };
    expect((await publishDue(d))[0].outcome).toBe('live');
    expect(t.products.every((p) => p.active)).toBe(true);
    expect(t.trend_candidates[0].status).toBe('live');
  });

  it('un produit en difficulté ne bloque pas les autres', async () => {
    const t = tables([cand(), cand({ id: 'c2', aliexpress_id: '1005099999999999', url_fr: 'https://www.aliexpress.com/item/1005099999999999.html', url_uk: null, price_uk: null })]);
    const m = makeDeps(t);
    m.offers.uk = null;
    await runOnce(m.d, { publish: false, limit: 2 });
    m.clock.t = new Date('2026-11-03T10:05:00Z');
    t.trend_candidates[0].product_ids = ['inconnu'];
    const res = await publishDue(m.d);
    expect(res.map((r: any) => r.outcome).sort()).toEqual(['blocked', 'live']);
  });
});
