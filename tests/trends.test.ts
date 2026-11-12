import { describe, it, expect } from 'vitest';
import { categoryStats, summarizeWeeks, mondayOf, extractAliexpressId, parseCommission, parseNumber, parseTrendCsv, toTrendCsv, type TrendCandidate } from '@/lib/trends';

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
  it('summarizeWeeks : semaines triées (récente d\'abord), refusés hors total', () => {
    const w = summarizeWeeks([
      { week: '2026-11-02', decision: 'yes' },
      { week: '2026-11-09', decision: 'pending' },
      { week: '2026-11-09', decision: 'pending' },
      { week: '2026-11-09', decision: 'no' },
      { week: '2026-11-09', decision: 'yes' },
    ]);
    expect(w.map((x) => x.week)).toEqual(['2026-11-09', '2026-11-02']);
    expect(w[0]).toEqual({ week: '2026-11-09', total: 3, pending: 2, yes: 1 });
    expect(w[1]).toEqual({ week: '2026-11-02', total: 1, pending: 0, yes: 1 });
  });
  it('categoryStats : une carte par catégorie, icône de la base sinon icône de secours', () => {
    const mk = (slug: string, decision: 'pending' | 'yes' | 'no', status = 'candidate') => ({ category_slug: slug, decision, status }) as TrendCandidate;
    const cards = categoryStats([mk('tech', 'pending'), mk('tech', 'yes', 'live'), mk('tech', 'no'), mk('loisirs', 'yes')], { tech: '🖥️' });
    expect(cards).toHaveLength(8);
    expect(cards.find((c) => c.slug === 'tech')).toMatchObject({ icon: '🖥️', total: 2, pending: 1, yes: 1, live: 1 });
    expect(cards.find((c) => c.slug === 'loisirs')).toMatchObject({ icon: '🎯', total: 1, yes: 1 });
    expect(cards.find((c) => c.slug === 'puericulture')).toMatchObject({ icon: '🍼', total: 0 });
  });
});
