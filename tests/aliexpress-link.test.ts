import { describe, it, expect } from 'vitest';
// @ts-ignore — module Node pur (.mjs) sans déclaration de types
import { planUpdate } from '../scripts/aliexpress/link.mjs';

const detail = { promotionLink: 'https://s.click.aliexpress.com/s/abc', price: 107.6, currency: 'EUR', commissionRate: 0.07, shopName: 'Euro Frame Store' };
const ok = { ok: true, checks: [] };

describe('planUpdate', () => {
  it('lien vérifié : lien, prix du jour daté, commission, vendeur si vide', () => {
    const r = planUpdate({ market: 'fr', seller_name: null }, detail, ok, '2026-11-02');
    expect(r.action).toBe('update');
    expect(r.patch).toEqual({ affiliate_url: detail.promotionLink, price: 107.6, price_currency: 'EUR', price_checked_at: '2026-11-02', commission_rate: 0.07, seller_name: 'Euro Frame Store' });
  });
  it('ne remplace pas un vendeur déjà renseigné', () => {
    const r = planUpdate({ market: 'fr', seller_name: 'Autre' }, detail, ok, '2026-11-02');
    expect(r.patch.seller_name).toBeUndefined();
  });
  it('produit absent du marché : indisponible, rien à écrire', () => {
    expect(planUpdate({ market: 'uk' }, null, null, '2026-11-02').action).toBe('unavailable');
  });
  it('contrôle échoué : bloqué avec les raisons, aucun patch', () => {
    const r = planUpdate({ market: 'es' }, detail, { ok: false, checks: [{ name: 'devise du marché', ok: false, detail: 'GBP / attendu EUR' }, { name: 'lien présent', ok: true, detail: 'oui' }] }, '2026-11-02');
    expect(r.action).toBe('blocked');
    expect(r.reasons).toEqual(['devise du marché : GBP / attendu EUR']);
    expect(r.patch).toBeUndefined();
  });
});
