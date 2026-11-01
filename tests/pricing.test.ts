import { describe, it, expect } from 'vitest';
import { getDisplayPrice } from '@/lib/pricing';

const base = { price: 301, price_currency: null, price_checked_at: '2026-10-30', affiliate_url: 'https://s.click.aliexpress.com/e/x' };

describe('getDisplayPrice', () => {
  it('affiche le prix avec astérisque et la date quand le relevé existe', () => {
    const d = getDisplayPrice(base, 'fr-FR', 'fr');
    expect(d?.label).toContain('301');
    expect(d?.label.endsWith('*')).toBe(true);
    expect(d?.checkedAt).toBeTruthy();
    expect(d?.merchantPrice).toBe(true);
  });
  it('utilise la devise du produit (GBP pour le UK)', () => {
    const d = getDisplayPrice({ ...base, price: 286, price_currency: 'GBP' }, 'en-GB', 'uk');
    expect(d?.label).toContain('£286');
  });
  it('masque le prix sans date de relevé', () => {
    expect(getDisplayPrice({ ...base, price_checked_at: null }, 'fr-FR', 'fr')).toBeNull();
  });
  it('masque le prix Amazon', () => {
    expect(getDisplayPrice({ ...base, affiliate_url: 'https://www.amazon.fr/dp/B0' }, 'fr-FR', 'fr')).toBeNull();
  });
  it('masque sans prix', () => {
    expect(getDisplayPrice({ ...base, price: null }, 'fr-FR', 'fr')).toBeNull();
  });
});
