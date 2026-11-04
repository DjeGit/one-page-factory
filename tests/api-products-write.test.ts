import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getProductById = vi.fn();
const updateProduct = vi.fn();
const createProduct = vi.fn();
const syncActivation = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getAllProducts: vi.fn(),
  getProductById: (...a: unknown[]) => getProductById(...a),
  updateProduct: (...a: unknown[]) => updateProduct(...a),
  createProduct: (...a: unknown[]) => createProduct(...a),
  deleteProduct: vi.fn(),
  generateSlug: (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
}));
vi.mock('@/lib/get-active-market', () => ({ getActiveMarket: () => 'fr' }));
vi.mock('@/lib/market-sync', () => ({ syncActivation: (...a: unknown[]) => syncActivation(...a) }));
vi.mock('@/lib/ttl-cache', () => ({ clearTtlCache: vi.fn() }));

import { POST } from '@/app/api/products/route';
import { PUT } from '@/app/api/products/[id]/route';

const ID = '11111111-1111-4111-8111-111111111111';
const AUTH = { authorization: 'Bearer secret-test', 'content-type': 'application/json' };

function put(body: unknown, id = ID) {
  return PUT(
    new NextRequest(`http://localhost/api/products/${id}`, { method: 'PUT', headers: AUTH, body: typeof body === 'string' ? body : JSON.stringify(body) }),
    { params: { id } },
  );
}
function post(body: unknown) {
  return POST(new NextRequest('http://localhost/api/products', { method: 'POST', headers: AUTH, body: JSON.stringify(body) }));
}

describe('écriture des fiches produit', () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = 'secret-test';
    getProductById.mockReset();
    updateProduct.mockReset();
    createProduct.mockReset();
    syncActivation.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('POST : valeurs invalides refusées avant la base (400)', async () => {
    const base = { name: 'Lampe', affiliate_url: 'https://exemple.com/x' };
    expect((await post({ ...base, market: 'com' })).status).toBe(400);
    expect((await post({ ...base, video_url: 'https://vimeo.com/1' })).status).toBe(400);
    expect((await post({ ...base, aliexpress_id: 'abc' })).status).toBe(400);
    expect((await post({ ...base, free_shipping: 'oui' })).status).toBe(400);
    expect((await post({ name: 'Lampe' })).status).toBe(400);
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('POST : crée avec le marché fourni et un slug fabriqué', async () => {
    createProduct.mockResolvedValue({ id: ID });
    const res = await post({ name: 'Lampe Bureau', affiliate_url: 'https://exemple.com/x', market: 'uk' });
    expect(res.status).toBe(201);
    expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ market: 'uk', slug: 'lampe-bureau' }));
  });

  it('PUT : identifiant non UUID -> 400, fiche absente -> 404 (avant : 500)', async () => {
    expect((await put({ name: 'x' }, 'pas-un-uuid')).status).toBe(400);
    getProductById.mockResolvedValue(null);
    expect((await put({ name: 'x' })).status).toBe(404);
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it('PUT : corps illisible -> 400', async () => {
    expect((await put('{oops')).status).toBe(400);
  });

  it('PUT : mise en ligne refusée (409) si le lien d’affiliation est vide', async () => {
    getProductById.mockResolvedValue({ id: ID, active: false, affiliate_url: '' });
    const res = await put({ active: true });
    expect(res.status).toBe(409);
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it('PUT : mise en ligne propagée aux autres marchés', async () => {
    getProductById.mockResolvedValue({ id: ID, active: false, affiliate_url: 'https://exemple.com/x' });
    updateProduct.mockResolvedValue({ id: ID, active: true, source_product_ref: null });
    syncActivation.mockResolvedValue({ activated: [], deactivated: [], skipped: [] });
    const res = await put({ active: true });
    expect(res.status).toBe(200);
    expect(syncActivation).toHaveBeenCalledWith({ id: ID, source_product_ref: null }, true);
  });

  it('PUT : échec de la propagation -> la fiche reste enregistrée et l’échec est signalé', async () => {
    getProductById.mockResolvedValue({ id: ID, active: true, affiliate_url: 'https://exemple.com/x' });
    updateProduct.mockResolvedValue({ id: ID, active: false, source_product_ref: null });
    syncActivation.mockRejectedValue(new Error('supabase down'));
    const res = await put({ active: false });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sync_error).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain('supabase down');
  });

  it('PUT : les champs protégés ne sont pas transmis', async () => {
    getProductById.mockResolvedValue({ id: ID, active: true, affiliate_url: 'https://exemple.com/x' });
    updateProduct.mockResolvedValue({ id: ID });
    await put({ name: 'Nouveau nom', id: 'autre', redirect_code: 'zzz', created_at: 'x' });
    const sent = updateProduct.mock.calls[0][1] as Record<string, unknown>;
    expect(sent).toEqual({ name: 'Nouveau nom' });
  });
});
