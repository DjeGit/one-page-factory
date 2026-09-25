import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase', () => ({
  getAllProducts: vi.fn(),
  createProduct: vi.fn(),
  generateSlug: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
}));
vi.mock('@/lib/get-active-market', () => ({
  getActiveMarket: () => 'fr',
}));

import { getAllProducts } from '@/lib/supabase';
import { GET } from '@/app/api/products/route';

const mockGetAllProducts = vi.mocked(getAllProducts);
const ORIGINAL_ENV = { ...process.env };

function makeRequest(authHeader?: string) {
  const headers = new Headers();
  if (authHeader) headers.set('authorization', authHeader);
  return new NextRequest('http://localhost/api/products', { headers });
}

describe('GET /api/products', () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = 'test-secret-123';
    mockGetAllProducts.mockReset();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('refuse sans token (401)', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('refuse avec un mauvais token (401)', async () => {
    const res = await GET(makeRequest('Bearer mauvais-token'));
    expect(res.status).toBe(401);
  });

  it('accepte avec le bon token et renvoie la liste des produits', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetAllProducts.mockResolvedValue([{ id: '1', name: 'Produit A' }] as any);
    const res = await GET(makeRequest('Bearer test-secret-123'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([{ id: '1', name: 'Produit A' }]);
  });
});
