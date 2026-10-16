import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  getProduct: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}));

import { getProduct } from '@/lib/supabase';
import { generateMetadata } from '@/app/[slug]/page';

const mockGetProduct = vi.mocked(getProduct);

const FULL_PRODUCT = {
  id: 'p1',
  slug: 'produit-test',
  name: 'Produit Test',
  description: 'Une description',
  meta_title: 'Titre meta',
  meta_description: 'Description meta',
  image_url: 'https://example.com/img.jpg',
};

describe('generateMetadata (app/[slug]/page.tsx)', () => {
  beforeEach(() => {
    mockGetProduct.mockReset();
  });

  it('retourne un titre de repli sans planter quand le produit est introuvable', async () => {
    mockGetProduct.mockResolvedValue(null);
    const metadata = await generateMetadata({ params: { slug: 'inconnu' } });
    expect(metadata.title).toBe('Produit introuvable');
  });

  it('genere des metadonnees completes pour un produit avec tous les champs', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetProduct.mockResolvedValue(FULL_PRODUCT as any);
    const metadata = await generateMetadata({ params: { slug: 'produit-test' } });
    expect(metadata.title).toBe('Titre meta');
    expect(metadata.openGraph?.title).toBe('Titre meta');
    expect(metadata.openGraph?.images).toEqual(['https://example.com/img.jpg']);
  });

  it('ne plante pas quand les champs optionnels sont null (regression bug metadata)', async () => {
    mockGetProduct.mockResolvedValue({
      id: 'p2',
      slug: 'produit-incomplet',
      name: 'Produit Incomplet',
      description: null,
      meta_title: null,
      meta_description: null,
      image_url: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await expect(
      generateMetadata({ params: { slug: 'produit-incomplet' } })
    ).resolves.not.toThrow();

    const metadata = await generateMetadata({ params: { slug: 'produit-incomplet' } });
    expect(metadata.title).toBe('Produit Incomplet');
    expect(metadata.openGraph?.images).toEqual([]);
  });

  it('le canonical suit le marché du produit, pas une variable d\'environnement (audit C1)', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://tendpick.com';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetProduct.mockResolvedValue({ ...FULL_PRODUCT, market: 'fr' } as any);
    const fr = await generateMetadata({ params: { slug: 'produit-test' } });
    expect(fr.alternates?.canonical).toBe('https://tendpick.fr/produit-test');
    expect(fr.openGraph?.url).toBe('https://tendpick.fr/produit-test');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetProduct.mockResolvedValue({ ...FULL_PRODUCT, market: 'uk' } as any);
    const uk = await generateMetadata({ params: { slug: 'produit-test' } });
    expect(uk.alternates?.canonical).toBe('https://tendpick.com/produit-test');
  });
});
