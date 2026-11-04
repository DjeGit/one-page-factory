import { describe, it, expect, vi } from 'vitest';

// SHOW_PRICES = true (hypothèse : prix Amazon servis un jour via l'API officielle).
vi.mock('@/lib/flags', () => ({ SHOW_PRICES: true, SHOW_MERCHANT_PRICES: false, SHOW_TESTIMONIALS: false }));

import { getDisplayPrice, getStructuredOffer } from '@/lib/pricing';

const amazon = { price: 49.9, price_currency: null, price_checked_at: '2026-11-01', affiliate_url: 'https://www.amazon.fr/dp/B0' };

describe('SHOW_PRICES activé', () => {
  it("affiche un prix Amazon seulement avec sa date, toujours avec astérisque et mention", () => {
    const d = getDisplayPrice(amazon, 'fr-FR', 'fr');
    expect(d?.label.endsWith('*')).toBe(true);
    expect(d?.merchantPrice).toBe(true);
    expect(d?.checkedAt).toBeTruthy();
  });
  it('un prix sans date reste masqué (jamais de prix non daté)', () => {
    expect(getDisplayPrice({ ...amazon, price_checked_at: null }, 'fr-FR', 'fr')).toBeNull();
    expect(getStructuredOffer({ ...amazon, price_checked_at: null }, 'fr-FR', 'fr')).toBeNull();
  });
  it('le JSON-LD suit : offre présente quand la fiche affiche le prix', () => {
    expect(getStructuredOffer(amazon, 'fr-FR', 'fr')).toEqual({ price: 49.9, priceCurrency: 'EUR' });
  });
});
