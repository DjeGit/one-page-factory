import { describe, it, expect } from 'vitest';
import { mondayOf, extractAliexpressId, parseCommission, parseNumber, parseTrendCsv, toTrendCsv, type TrendCandidate } from '@/lib/trends';

describe('lib/trends', () => {
  it('mondayOf renvoie le lundi de la semaine', () => {
    expect(mondayOf(new Date('2026-11-01T10:00:00Z'))).toBe('2026-10-26'); // dimanche
    expect(mondayOf(new Date('2026-11-02T00:00:00Z'))).toBe('2026-11-02'); // lundi
  });
  it('extractAliexpressId', () => {
    expect(extractAliexpressId('https://www.aliexpress.com/item/1005010644996006.html')).toBe('1005010644996006');
    expect(extractAliexpressId('https://exemple.com')).toBeNull();
  });
  it('commission et nombres', () => {
    expect(parseCommission('7 %')).toBe(0.07);
    expect(parseCommission('0,07')).toBe(0.07);
    expect(parseCommission('0.08')).toBe(0.08);
    expect(parseNumber('125,45')).toBe(125.45);
    expect(parseNumber('n.d.')).toBeNull();
  });
  it('export puis import conservent les décisions', () => {
    const row = {
      id: '1', aliexpress_id: '1005010644996006', week: '2026-10-26', category_slug: 'tech', name: 'Shokz; "OpenRun"',
      product_type: null, image_url: null, price_fr: 125.45, price_es: 142.52, price_uk: 152.06,
      commission_fr: 0.07, commission_uk: 0.07, rating: 4.8, reviews: 543, sales: 5000, seller: null,
      free_shipping_fr: null, free_shipping_es: null, free_shipping_uk: null,
      url_fr: 'https://www.aliexpress.com/item/1005010644996006.html', url_uk: null, note: null,
      decision: 'yes', decided_at: null, status: 'validated', error: null,
    } as TrendCandidate;
    const { rows, errors } = parseTrendCsv(toTrendCsv([row]));
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ aliexpress_id: '1005010644996006', category_slug: 'tech', name: 'Shokz; "OpenRun"', price_fr: 125.45, commission_fr: 0.07, decision: 'yes' });
  });
  it('ignore les lignes sans lien valide', () => {
    const { rows, errors } = parseTrendCsv('Produit;Catégorie;Lien produit FR/ES\nA;Tech;pas un lien');
    expect(rows).toHaveLength(0);
    expect(errors.length).toBe(1);
  });
});
