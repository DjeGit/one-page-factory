import { describe, it, expect } from 'vitest';
import { validateProductInput } from '@/app/api/_lib/product-input';

const base = { name: 'Casque Bluetooth', affiliate_url: 'https://s.click.aliexpress.com/e/_abc' };

function ok(input: Record<string, unknown>, mode: 'create' | 'update' = 'create') {
  const r = validateProductInput(input, mode);
  if (!r.ok) throw new Error(`refusé : ${r.error}`);
  return r.data;
}
function refused(input: Record<string, unknown>, mode: 'create' | 'update' = 'create') {
  const r = validateProductInput(input, mode);
  expect(r.ok).toBe(false);
  return r.ok ? '' : r.error;
}

describe('validateProductInput', () => {
  it('création : nom et lien d’affiliation requis', () => {
    refused({ affiliate_url: base.affiliate_url });
    refused({ name: 'X' });
    expect(ok(base).name).toBe('Casque Bluetooth');
  });

  it('refuse un lien qui n’est pas http(s) (javascript:, data:…)', () => {
    refused({ ...base, affiliate_url: 'javascript:alert(1)' });
    refused({ ...base, affiliate_url: 'ftp://exemple.com/x' });
  });

  it('modification : lien vide accepté (brouillon), lien invalide refusé', () => {
    expect(ok({ affiliate_url: '' }, 'update').affiliate_url).toBe('');
    refused({ affiliate_url: 'pas une url' }, 'update');
  });

  it('retire les champs protégés (id, dates, code de redirection, jointure)', () => {
    const data = ok({ ...base, id: 'x', created_at: 'y', updated_at: 'z', redirect_code: 'abc', category: { id: 1 }, sync: {} });
    for (const k of ['id', 'created_at', 'updated_at', 'redirect_code', 'category', 'sync']) expect(data).not.toHaveProperty(k);
  });

  it('marché : fr, es, uk seulement (« com » et le reste refusés)', () => {
    for (const m of ['fr', 'es', 'uk']) expect(ok({ ...base, market: m }).market).toBe(m);
    refused({ ...base, market: 'com' });
    refused({ ...base, market: 'de' });
    refused({ ...base, market: 5 });
  });

  it('livraison gratuite : booléen, null devient false (colonne NOT NULL)', () => {
    expect(ok({ ...base, free_shipping: true }).free_shipping).toBe(true);
    expect(ok({ ...base, free_shipping: null }).free_shipping).toBe(false);
    refused({ ...base, free_shipping: 'oui' });
  });

  it('vidéo : lien YouTube uniquement', () => {
    expect(ok({ ...base, video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }).video_url).toContain('youtube.com');
    expect(ok({ ...base, video_url: '' }).video_url).toBeNull();
    refused({ ...base, video_url: 'https://vimeo.com/123456' });
    refused({ ...base, video_url: 'https://exemple.com/video.mp4' });
  });

  it('identifiant AliExpress : chiffres uniquement', () => {
    expect(ok({ ...base, aliexpress_id: '1005006789012345' }).aliexpress_id).toBe('1005006789012345');
    expect(ok({ ...base, aliexpress_id: null }).aliexpress_id).toBeNull();
    refused({ ...base, aliexpress_id: '10050abc' });
    refused({ ...base, aliexpress_id: '123' });
  });

  it('montants : positifs, finis, commission en fraction 0-1', () => {
    expect(ok({ ...base, price: '19.9' }).price).toBe(19.9);
    expect(ok({ ...base, price: '' }).price).toBeNull();
    refused({ ...base, price: -1 });
    refused({ ...base, price: 'abc' });
    expect(ok({ ...base, commission_rate: 0.08 }).commission_rate).toBe(0.08);
    refused({ ...base, commission_rate: 8 });
  });

  it('devise EUR ou GBP, date de relevé AAAA-MM-JJ', () => {
    expect(ok({ ...base, price_currency: 'GBP' }).price_currency).toBe('GBP');
    refused({ ...base, price_currency: 'USD' });
    expect(ok({ ...base, price_checked_at: '2026-11-01T10:00:00Z' }).price_checked_at).toBe('2026-11-01');
    refused({ ...base, price_checked_at: 'hier' });
  });

  it('références en UUID, origine du produit dans la liste', () => {
    refused({ ...base, category_id: 'pas-un-uuid' });
    expect(ok({ ...base, category_id: '11111111-1111-4111-8111-111111111111' }).category_id).toBeTruthy();
    expect(ok({ ...base, category_id: '' }).category_id).toBeNull();
    refused({ ...base, product_source: 'inconnu' });
  });

  it('slug : minuscules et tirets', () => {
    expect(ok({ ...base, slug: 'casque-bluetooth-2' }).slug).toBe('casque-bluetooth-2');
    refused({ ...base, slug: 'Casque Bluetooth' });
    expect('slug' in ok({ ...base, slug: '' })).toBe(false);
  });

  it('listes et booléens du formulaire', () => {
    refused({ ...base, faq: 'texte' });
    refused({ ...base, images: 'a.jpg' });
    refused({ ...base, active: 'true' });
    expect(ok({ ...base, images: null }).images).toEqual([]);
  });
});
