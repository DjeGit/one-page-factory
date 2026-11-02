import { describe, it, expect } from 'vitest';
// @ts-ignore — module Node pur (.mjs) sans déclaration de types
import { signParams, parseRate, parseProductDetail, parseLinkGenerate, extractProductId, resolveLink, verifyAffiliateLink, callApi, getCredentials } from '../scripts/aliexpress/api.mjs';

const detailJson = (over: any = {}) => ({
  aliexpress_affiliate_productdetail_get_response: {
    resp_result: {
      resp_code: 200, resp_msg: 'call succeeds',
      result: { products: { product: [{
        product_id: 1005010644996006, product_title: 'SHOKZ OpenRun Pro 2', promotion_link: 'https://s.click.aliexpress.com/e/_abc',
        product_detail_url: 'https://www.aliexpress.com/item/1005010644996006.html', target_sale_price: '125.45', target_original_price: '180.00',
        target_sale_price_currency: 'EUR', commission_rate: '7.0%', shop_name: 'Euro Frame Store', evaluate_rate: '96.5%', lastest_volume: 1200,
        product_main_image_url: 'https://ae01.alicdn.com/kf/a.jpg', product_small_image_urls: { string: ['https://ae01.alicdn.com/kf/b.jpg'] }, ...over,
      }] } },
    },
  },
});

describe('aliexpress api', () => {
  it('signParams : HMAC-SHA256 majuscules, indépendant de l\'ordre, ignore sign et les vides', () => {
    const a = signParams({ b: '2', a: '1', sign: 'x', e: '' }, 'secret');
    const b = signParams({ a: '1', b: '2' }, 'secret');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9A-F]{64}$/);
    expect(signParams({ a: '1', b: '2' }, 'autre')).not.toBe(a);
  });

  it('signParams md5 et préfixe, getCredentials nettoie les guillemets', () => {
    expect(signParams({ a: '1' }, 's', 'md5')).toMatch(/^[0-9A-F]{32}$/);
    expect(signParams({ a: '1' }, 's', 'sha256', '/x')).not.toBe(signParams({ a: '1' }, 's', 'sha256'));
    const c = getCredentials({ ALIEXPRESS_APP_KEY: ' "123" ', ALIEXPRESS_APP_SECRET: "'abc'\r", ALIEXPRESS_TRACKING_ID: 't' });
    expect([c.appKey, c.appSecret]).toEqual(['123', 'abc']);
  });

  it('callApi : passerelle TOP + variantes d\'extras', async () => {
    let url = '';
    let sent: URLSearchParams | null = null;
    const fetchImpl = async (u: string, init: any) => { url = u; sent = new URLSearchParams(init.body); return new Response('{}', { status: 200 }); };
    const creds = { appKey: 'k', appSecret: 's', trackingId: 't' };
    await callApi('m', {}, { creds, fetchImpl: fetchImpl as any, gateway: 'https://gw.api.taobao.com/router/rest', extras: 'top', timestampUnit: 'datetime', now: () => Date.UTC(2026, 10, 2, 0, 0, 0) });
    expect(url).toBe('https://gw.api.taobao.com/router/rest');
    expect(sent!.get('partner_id')).toBeNull();
    expect(sent!.get('v')).toBe('2.0');
    expect(sent!.get('timestamp')).toBe('2026-11-02 08:00:00'); // heure de Shanghai
  });

  it('callApi : réessaie après ApiCallLimit puis réussit, et ne réessaie pas les autres erreurs', async () => {
    const creds = { appKey: 'k', appSecret: 's', trackingId: 't' };
    const limit = JSON.stringify({ error_response: { code: 'ApiCallLimit', msg: 'Api access frequency exceeds the limit. this ban will last 1 seconds' } });
    let n = 0;
    const waits: number[] = [];
    const flaky = async () => new Response(++n <= 2 ? limit : '{"ok":true}', { status: 200 });
    const out = await callApi('m', {}, { creds, fetchImpl: flaky as any, sleepImpl: async (ms: number) => { waits.push(ms); } });
    expect(out).toEqual({ ok: true });
    expect(n).toBe(3);
    expect(waits).toEqual([1500, 3000]);

    let m = 0;
    const bad = async () => { m++; return new Response(JSON.stringify({ error_response: { code: '29', msg: 'Invalid app Key' } }), { status: 200 }); };
    await expect(callApi('m', {}, { creds, fetchImpl: bad as any, sleepImpl: async () => {} })).rejects.toThrow(/Invalid app Key/);
    expect(m).toBe(1);

    let k = 0;
    const always = async () => { k++; return new Response(limit, { status: 200 }); };
    await expect(callApi('m', {}, { creds, fetchImpl: always as any, sleepImpl: async () => {}, retries: 2 })).rejects.toThrow(/ApiCallLimit/);
    expect(k).toBe(3);
  });

  it('callApi : modes GET et système dans l\'adresse', async () => {
    const calls: { url: string; init: any }[] = [];
    const fetchImpl = async (u: string, init: any) => { calls.push({ url: u, init }); return new Response('{}', { status: 200 }); };
    const creds = { appKey: 'k', appSecret: 's', trackingId: 't' };
    await callApi('m', { product_ids: '1' }, { creds, fetchImpl: fetchImpl as any, signMethod: 'sha256', extras: false, transport: 'query' });
    await callApi('m', { product_ids: '1' }, { creds, fetchImpl: fetchImpl as any, signMethod: 'sha256', extras: false, transport: 'split' });
    const q = new URL(calls[0].url).searchParams;
    expect(calls[0].init.method).toBe('GET');
    expect([q.get('product_ids'), q.get('method'), !!q.get('sign')]).toEqual(['1', 'm', true]);
    const s = new URL(calls[1].url).searchParams;
    expect(calls[1].init.method).toBe('POST');
    expect([s.get('method'), !!s.get('sign'), s.get('product_ids')]).toEqual(['m', true, null]);
    expect(new URLSearchParams(calls[1].init.body).get('product_ids')).toBe('1');
    // même signature quel que soit le mode d'envoi
    expect(q.get('sign')).toBe(s.get('sign').length === 64 ? q.get('sign') : null);
  });

  it('parseRate', () => {
    expect(parseRate('7.0%')).toBe(0.07);
    expect(parseRate('8')).toBe(0.08);
    expect(parseRate(0.07)).toBe(0.07);
    expect(parseRate(undefined)).toBeNull();
  });

  it('parseProductDetail / parseLinkGenerate', () => {
    const d = parseProductDetail(detailJson(), '1005010644996006');
    expect(d).toMatchObject({ productId: '1005010644996006', price: 125.45, currency: 'EUR', commissionRate: 0.07, shopName: 'Euro Frame Store' });
    expect(d.images).toEqual(['https://ae01.alicdn.com/kf/b.jpg']);
    expect(parseProductDetail({ aliexpress_affiliate_productdetail_get_response: { resp_result: { resp_code: 200, result: { products: { product: [] } } } } }, '1')).toBeNull();
    expect(() => parseProductDetail({ aliexpress_affiliate_productdetail_get_response: { resp_result: { resp_code: 405, resp_msg: 'nope' } } }, '1')).toThrow(/405/);
    const l = parseLinkGenerate({ aliexpress_affiliate_link_generate_response: { resp_result: { resp_code: 200, result: { promotion_links: { promotion_link: [{ source_value: 'u', promotion_link: 'https://s.click.aliexpress.com/e/_z' }] } } } } });
    expect(l).toEqual([{ source: 'u', link: 'https://s.click.aliexpress.com/e/_z' }]);
  });

  it('extractProductId', () => {
    expect(extractProductId('https://www.aliexpress.com/item/1005010644996006.html?x=1')).toBe('1005010644996006');
    expect(extractProductId('https://star.aliexpress.com/share/share.htm?redirectUrl=https%3A%2F%2Fwww.aliexpress.com%2Fitem%2F1005010644996006.html%3Fa%3D1')).toBe('1005010644996006');
    expect(extractProductId('https://s.click.aliexpress.com/e/_abc')).toBeNull();
  });

  it('resolveLink suit les redirections jusqu\'à la page produit', async () => {
    const hops: Record<string, [number, string | null]> = {
      'https://s.click.aliexpress.com/e/_abc': [302, 'https://star.aliexpress.com/share/share.htm?redirectUrl=https%3A%2F%2Ffr.aliexpress.com%2Fitem%2F1005010644996006.html'],
    };
    const fetchImpl = async (u: string) => {
      const h = hops[u];
      return new Response(null, h ? { status: h[0], headers: h[1] ? { location: h[1] } : {} } : { status: 200 });
    };
    const r = await resolveLink('https://s.click.aliexpress.com/e/_abc', { fetchImpl: fetchImpl as any });
    expect(r.productId).toBe('1005010644996006');
  });

  it('verifyAffiliateLink : accepte le bon produit, refuse un autre produit ou un prix aberrant', async () => {
    const d = parseProductDetail(detailJson(), '1005010644996006');
    const good = async () => new Response(null, { status: 302, headers: { location: 'https://www.aliexpress.com/item/1005010644996006.html' } });
    const bad = async () => new Response(null, { status: 302, headers: { location: 'https://www.aliexpress.com/item/1005099999999999.html' } });
    const ok = await verifyAffiliateLink({ link: d.promotionLink, detail: d, expected: { productId: '1005010644996006', currency: 'EUR', price: 125.45 }, fetchImpl: good as any });
    expect(ok.ok).toBe(true);
    const wrong = await verifyAffiliateLink({ link: d.promotionLink, detail: d, expected: { productId: '1005010644996006', currency: 'EUR' }, fetchImpl: bad as any });
    expect(wrong.ok).toBe(false);
    expect(wrong.checks.find((c: any) => c.name.includes('bon produit')).ok).toBe(false);
    const price = await verifyAffiliateLink({ link: d.promotionLink, detail: d, expected: { productId: '1005010644996006', currency: 'EUR', price: 60 }, fetchImpl: good as any });
    expect(price.ok).toBe(false);
    const gbp = await verifyAffiliateLink({ link: d.promotionLink, detail: d, expected: { productId: '1005010644996006', currency: 'GBP' }, fetchImpl: good as any });
    expect(gbp.ok).toBe(false);
  });

  it('callApi : requête signée, erreurs de l\'API remontées, clés manquantes signalées', async () => {
    let sent: URLSearchParams | null = null;
    const fetchImpl = async (_u: string, init: any) => { sent = new URLSearchParams(init.body); return new Response(JSON.stringify({ ok: 1 }), { status: 200 }); };
    const creds = { appKey: 'k', appSecret: 's', trackingId: 't' };
    await callApi('m.test', { x: '1' }, { creds, fetchImpl: fetchImpl as any, now: () => 1700000000000 });
    expect(sent!.get('app_key')).toBe('k');
    expect(sent!.get('method')).toBe('m.test');
    expect([sent!.get('v'), sent!.get('format'), sent!.get('partner_id'), sent!.get('sign_method')]).toEqual(['2.0', 'json', 'top-apitools', 'md5']);
    expect(sent!.get('timestamp')).toBe('1700000000000');
    const p = Object.fromEntries(sent!.entries());
    expect(p.sign).toBe(signParams(p, 's', 'md5'));
    const err = async () => new Response(JSON.stringify({ error_response: { code: 'IncompleteSignature', msg: 'bad sign' } }), { status: 200 });
    await expect(callApi('m', {}, { creds, fetchImpl: err as any })).rejects.toThrow(/IncompleteSignature/);
    expect(() => getCredentials({})).toThrow(/ALIEXPRESS_APP_KEY/);
  });
});
