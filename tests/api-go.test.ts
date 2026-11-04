import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getProductByCode = vi.fn();
const trackClick = vi.fn();
let recentClicks = 0;

vi.mock('@/lib/supabase', () => ({
  getProductByCode: (...a: unknown[]) => getProductByCode(...a),
  trackClick: (...a: unknown[]) => trackClick(...a),
  getSupabaseAdmin: () => ({
    from: () => {
      const q: Record<string, unknown> = {};
      const chain = () => q;
      Object.assign(q, {
        select: chain, eq: chain, gte: chain, maybeSingle: chain,
        then: (res: (v: unknown) => unknown) => Promise.resolve({ count: recentClicks, data: null, error: null }).then(res),
      });
      return q;
    },
  }),
}));
vi.mock('@/app/api/_lib/ab-test', () => ({ trackAbClick: vi.fn().mockResolvedValue(undefined) }));

import { GET } from '@/app/api/go/[code]/route';

function call(code: string, headers: Record<string, string> = {}) {
  return GET(new NextRequest(`http://localhost/api/go/${code}`, { headers }), { params: { code } });
}

describe('GET /api/go/[code]', () => {
  beforeEach(() => {
    getProductByCode.mockReset();
    trackClick.mockReset().mockResolvedValue(undefined);
    recentClicks = 0;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('code mal formé : retour à l’accueil sans toucher la base', async () => {
    const res = await call("a'b%20c");
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/');
    expect(getProductByCode).not.toHaveBeenCalled();
  });

  it('produit inconnu : accueil', async () => {
    getProductByCode.mockResolvedValue(null);
    const res = await call('abcd1234');
    expect(new URL(res.headers.get('location')!).pathname).toBe('/');
  });

  it('redirige vers le lien affilié et enregistre UN clic', async () => {
    getProductByCode.mockResolvedValue({ id: 'p1', slug: 'lampe', market: 'fr', affiliate_url: 'https://s.click.aliexpress.com/e/_x' });
    const res = await call('abcd1234', { 'x-forwarded-for': '5.5.5.5' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://s.click.aliexpress.com/e/_x');
    expect(trackClick).toHaveBeenCalledTimes(1);
  });

  it('lien non http(s) (javascript:) ignoré : le visiteur reste sur la fiche', async () => {
    getProductByCode.mockResolvedValue({ id: 'p1', slug: 'lampe', market: 'fr', affiliate_url: 'javascript:alert(1)' });
    const res = await call('abcd1234');
    expect(new URL(res.headers.get('location')!).pathname).toBe('/lampe');
  });

  it('fiche sans lien : page produit, pas l’accueil', async () => {
    getProductByCode.mockResolvedValue({ id: 'p1', slug: 'lampe', market: 'es', affiliate_url: '' });
    const res = await call('abcd1234');
    expect(new URL(res.headers.get('location')!).pathname).toBe('/lampe');
  });

  it('anti-fraude : plus de 20 clics/heure depuis la même IP -> page produit, pas de clic compté', async () => {
    recentClicks = 25;
    getProductByCode.mockResolvedValue({ id: 'p1', slug: 'lampe', market: 'fr', affiliate_url: 'https://exemple.com/x' });
    const res = await call('abcd1234', { 'x-forwarded-for': '6.6.6.6' });
    expect(new URL(res.headers.get('location')!).pathname).toBe('/lampe');
    expect(trackClick).not.toHaveBeenCalled();
  });

  it('sans IP identifiable : aucun contrôle anti-fraude, redirection affiliée normale', async () => {
    recentClicks = 999;
    getProductByCode.mockResolvedValue({ id: 'p1', slug: 'lampe', market: 'fr', affiliate_url: 'https://exemple.com/x' });
    const res = await call('abcd1234');
    expect(res.headers.get('location')).toBe('https://exemple.com/x');
  });

  it('erreur interne : accueil, jamais 500', async () => {
    getProductByCode.mockRejectedValue(new Error('db down'));
    const res = await call('abcd1234');
    expect(res.status).toBe(302);
  });
});
