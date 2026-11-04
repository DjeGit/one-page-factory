import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const trackPageView = vi.fn();
const incrementAbCounter = vi.fn();

vi.mock('@/lib/supabase', () => ({
  trackPageView: (...a: unknown[]) => trackPageView(...a),
  getAnalytics: vi.fn(),
  getSupabaseAdmin: () => ({}),
}));
vi.mock('@/lib/get-active-market', () => ({ getActiveMarket: () => 'fr' }));
vi.mock('@/app/api/_lib/ab-test', async (orig) => ({
  ...(await orig<typeof import('@/app/api/_lib/ab-test')>()),
  incrementAbCounter: (...a: unknown[]) => incrementAbCounter(...a),
}));

import { POST } from '@/app/api/analytics/route';

const PRODUCT = '11111111-1111-4111-8111-111111111111';
const TEST = '22222222-2222-4222-8222-222222222222';
let ipCounter = 1;

function post(body: unknown) {
  return new NextRequest('http://localhost/api/analytics', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': `10.1.0.${ipCounter++}` },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/analytics (public)', () => {
  beforeEach(() => {
    trackPageView.mockReset().mockResolvedValue(undefined);
    incrementAbCounter.mockReset().mockResolvedValue('ok');
  });

  it('corps illisible : 400', async () => {
    expect((await POST(post('{oops'))).status).toBe(400);
  });

  it('productId qui n’est pas un UUID : 400 (avant : succès sans rien enregistrer)', async () => {
    expect((await POST(post({ productId: '42', type: 'view' }))).status).toBe(400);
    expect(trackPageView).not.toHaveBeenCalled();
  });

  it('vue : enregistrée', async () => {
    expect((await POST(post({ productId: PRODUCT, type: 'view' }))).status).toBe(200);
    expect(trackPageView).toHaveBeenCalledTimes(1);
  });

  it('clic : accepté mais non compté ici (déjà compté par /api/go, sinon double compte)', async () => {
    const res = await POST(post({ productId: PRODUCT, type: 'click' }));
    expect(res.status).toBe(200);
    expect(trackPageView).not.toHaveBeenCalled();
    expect(incrementAbCounter).not.toHaveBeenCalled();
  });

  it('ab_view : compte une vue de variante (avant : refusé en 400)', async () => {
    const res = await POST(post({ productId: PRODUCT, type: 'ab_view', testId: TEST, variant: 'b' }));
    expect(res.status).toBe(200);
    expect(incrementAbCounter).toHaveBeenCalledWith(expect.anything(), TEST, 'b', 'views');
  });

  it('ab_view invalide : 400', async () => {
    expect((await POST(post({ productId: PRODUCT, type: 'ab_view', testId: 'x', variant: 'b' }))).status).toBe(400);
    expect((await POST(post({ productId: PRODUCT, type: 'ab_view', testId: TEST, variant: 'z' }))).status).toBe(400);
  });

  it('type inconnu : 400', async () => {
    expect((await POST(post({ productId: PRODUCT, type: 'delete' }))).status).toBe(400);
  });
});
