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
    expect(sent!.get('timestamp')).toBe('1700000000000');
    const p = Object.fromEntries(sent!.entries());
    expect(p.sign).toBe(signParams(p, 's'));
    const err = async () => new Response(JSON.stringify({ error_response: { code: 'IncompleteSignature', msg: 'bad sign' } }), { status: 200 });
    await expect(callApi('m', {}, { creds, fetchImpl: err as any })).rejects.toThrow(/IncompleteSignature/);
    expect(() => getCredentials({})).toThrow(/ALIEXPRESS_APP_KEY/);
  });
});
