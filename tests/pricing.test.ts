import { describe, it, expect } from 'vitest';
import { getDisplayPrice, getCardPrice, getStructuredOffer } from '@/lib/pricing';

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

describe('getCardPrice (vignettes)', () => {
  it('même prix que la fiche mais sans astérisque', () => {
    expect(getCardPrice(base, 'fr-FR', 'fr')).toContain('301');
    expect(getCardPrice(base, 'fr-FR', 'fr')?.includes('*')).toBe(false);
    expect(getCardPrice({ ...base, price: 286, price_currency: 'GBP' }, 'en-GB', 'uk')).toBe('£286.00');
  });
  it('masqué dans les mêmes cas que la fiche (sans date, Amazon, sans prix)', () => {
    expect(getCardPrice({ ...base, price_checked_at: null }, 'fr-FR', 'fr')).toBeNull();
    expect(getCardPrice({ ...base, affiliate_url: 'https://www.amazon.fr/dp/B0' }, 'fr-FR', 'fr')).toBeNull();
    expect(getCardPrice({ ...base, price: null }, 'fr-FR', 'fr')).toBeNull();
  });
});

describe('cas limites des prix', () => {
  it('masque un prix dont la date de relevé est invalide (au lieu de faire planter la page)', () => {
    expect(getDisplayPrice({ ...base, price_checked_at: 'pas-une-date' }, 'fr-FR', 'fr')).toBeNull();
    expect(getCardPrice({ ...base, price_checked_at: 'pas-une-date' }, 'fr-FR', 'fr')).toBeNull();
  });
  it('masque un prix nul, négatif ou non numérique', () => {
    expect(getDisplayPrice({ ...base, price: 0 }, 'fr-FR', 'fr')).toBeNull();
    expect(getDisplayPrice({ ...base, price: -5 }, 'fr-FR', 'fr')).toBeNull();
    expect(getDisplayPrice({ ...base, price: Number.NaN }, 'fr-FR', 'fr')).toBeNull();
  });
  it('devise inconnue : pas de prix plutôt qu’une erreur', () => {
    expect(getDisplayPrice({ ...base, price_currency: 'XXXX' as never }, 'fr-FR', 'fr')).toBeNull();
  });
  it("sans devise, la devise du marché s'applique (EUR) ; avec GBP on garde £", () => {
    expect(getDisplayPrice(base, 'en-GB', 'uk')?.label).toContain('€');
    expect(getDisplayPrice({ ...base, price_currency: 'GBP' }, 'en-GB', 'uk')?.label).toContain('£');
  });
  it('la date est dans la langue du marché', () => {
    expect(getDisplayPrice(base, 'fr-FR', 'fr')?.checkedAt).toContain('octobre');
    expect(getDisplayPrice(base, 'es-ES', 'es')?.checkedAt).toContain('octubre');
    expect(getDisplayPrice(base, 'en-GB', 'uk')?.checkedAt).toContain('October');
  });
});

describe('getStructuredOffer (données structurées)', () => {
  it('donne exactement le prix et la devise affichés sur la fiche', () => {
    expect(getStructuredOffer(base, 'fr-FR', 'fr')).toEqual({ price: 301, priceCurrency: 'EUR' });
    expect(getStructuredOffer({ ...base, price: 286, price_currency: 'GBP' }, 'en-GB', 'uk')).toEqual({ price: 286, priceCurrency: 'GBP' });
  });
  it('null dès que la fiche ne montre pas de prix', () => {
    expect(getStructuredOffer({ ...base, price_checked_at: null }, 'fr-FR', 'fr')).toBeNull();
    expect(getStructuredOffer({ ...base, affiliate_url: 'https://amzn.to/abc' }, 'fr-FR', 'fr')).toBeNull();
    expect(getStructuredOffer({ ...base, price: null }, 'fr-FR', 'fr')).toBeNull();
  });
});
