import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';

const state = vi.hoisted(() => ({
  host: 'tendpick.fr',
  products: [] as Record<string, unknown>[],
  categories: [] as Record<string, unknown>[],
  posts: [] as Record<string, unknown>[],
}));

vi.mock('next/headers', () => ({
  headers: () => new Headers({ host: state.host }),
  cookies: () => ({ get: () => undefined }),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  permanentRedirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  useRouter: () => ({ push() {} }),
  usePathname: () => '/',
}));
vi.mock('@/lib/supabase', () => {
  // Constructeur de requête « thenable » : filtre en mémoire selon la table.
  function builder(table: string) {
    const filters: Array<(r: Record<string, unknown>) => boolean> = [];
    const b: Record<string, unknown> = {};
    const rows = () => {
      const src = table === 'products' ? state.products : table === 'blog_posts' ? state.posts : table === 'categories' ? state.categories : [];
      return src.filter((r) => filters.every((f) => f(r)));
    };
    b.select = () => b;
    b.eq = (col: string, val: unknown) => (filters.push((r) => r[col] === val), b);
    b.is = () => b;
    b.not = () => b;
    b.in = () => b;
    b.order = () => b;
    b.limit = () => b;
    b.or = () => b;
    b.contains = () => b;
    b.range = () => b;
    b.maybeSingle = async () => ({ data: null, error: null });
    b.single = async () => ({ data: null, error: null });
    b.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows(), error: null });
    return b;
  }
  const visible = (market: string) =>
    state.categories.filter((c) => state.products.some((p) => p.category_id === c.id && p.market === market && p.active));
  return {
    getSupabaseAdmin: () => ({ from: (t: string) => builder(t) }),
    getActiveCategories: async (market: string) => visible(market),
    getProductsByIds: async () => [],
  };
});
vi.mock('@/lib/site-products', async (orig) => {
  const real = await orig<typeof import('@/lib/site-products')>();
  return { ...real, getMarketCatalog: async (market: string) => state.products.filter((p) => p.market === market && p.active) };
});

import HomePage from '@/app/page';
import ProduitsPage from '@/app/produits/page';
import BioPage from '@/app/bio/page';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { clearTtlCache } from '@/lib/ttl-cache';

function product(over: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    slug: 'casque-aliexpress',
    name: 'Casque Bluetooth',
    market: 'fr',
    active: true,
    category_id: 'c1',
    affiliate_url: 'https://s.click.aliexpress.com/e/abc',
    redirect_code: 'abc123',
    price: 49.9,
    price_currency: 'EUR',
    price_checked_at: '2026-11-01',
    free_shipping: true,
    image_url: 'https://ae01.alicdn.com/kf/x.jpg',
    images: [],
    updated_at: '2026-11-02T10:00:00Z',
    ...over,
  };
}

beforeEach(() => {
  clearTtlCache();
  state.host = 'tendpick.fr';
  state.categories = [{ id: 'c1', slug: 'tech', name_fr: 'Tech', name_es: 'Tecnología', name_uk: 'Tech', icon: null }];
  state.products = [product(), product({ id: 'p2', slug: 'montre-amazon', name: 'Montre Amazon', affiliate_url: 'https://www.amazon.fr/dp/B0', price: 100, redirect_code: 'zzz' })];
  state.posts = [];
});

describe('accueil / catalogue / top ventes', () => {
  it('accueil : vignettes avec prix sans astérisque ; le prix Amazon reste masqué', async () => {
    const html = renderToStaticMarkup(await HomePage({ searchParams: {} }));
    expect(html).toContain('Casque Bluetooth');
    expect(html).toMatch(/49,90\s*€/);
    expect(html).not.toMatch(/49,90[^<]*\*/);
    expect(html).not.toMatch(/100,00\s*€/);
    expect(html).toContain('Livraison gratuite');
    expect(html).toContain('Prix chez le marchand'); // Amazon
  });

  it('accueil : marché sans aucun produit => la page s’affiche (pas d’erreur)', async () => {
    state.host = 'tendpick.es';
    const html = renderToStaticMarkup(await HomePage({ searchParams: {} }));
    expect(html).toContain('Tendpick');
    expect(html).not.toContain('Casque Bluetooth');
  });

  it('/produits : recherche sans accents, sans produit => message, pas d’erreur', async () => {
    let html = renderToStaticMarkup(await ProduitsPage({ searchParams: { q: 'CASQUE' } }));
    expect(html).toContain('Casque Bluetooth');
    expect(html).not.toContain('Montre Amazon');
    html = renderToStaticMarkup(await ProduitsPage({ searchParams: { q: 'zzz introuvable' } }));
    expect(html).not.toContain('Casque Bluetooth');
    html = renderToStaticMarkup(await ProduitsPage({ searchParams: { q: ['a', 'b'] as unknown as string } }));
    expect(html).toContain('Casque Bluetooth');
  });
});

describe('/bio (page lien en bio)', () => {
  it('se rend avec des produits (les gestionnaires onMouseEnter la faisaient planter) et reste en français/espagnol/anglais', async () => {
    const html = renderToStaticMarkup(await BioPage());
    expect(html).toContain('Casque Bluetooth');
    expect(html).toContain('href="/casque-aliexpress"');
    // Composant serveur : un gestionnaire d'événement (onClick, onMouseEnter…) dans ce fichier
    // ferait planter la page dès qu'un produit est en ligne (erreur Next « Event handlers cannot be passed »).
    const source = readFileSync('app/bio/page.tsx', 'utf8');
    expect(source).not.toMatch(/\bon[A-Z][A-Za-z]+=\{/);
    expect(source).not.toMatch(/^'use client'/m);
    state.host = 'tendpick.com';
    state.products = [product({ market: 'uk' })];
    expect(renderToStaticMarkup(await BioPage())).toContain('Our picks');
  });
});

describe('sitemap et robots', () => {
  it('sitemap : uniquement des contenus du marché, catégories non vides, pas de page légale', async () => {
    state.categories.push({ id: 'c-vide', slug: 'loisirs', name_fr: 'Loisirs', name_es: 'Ocio', name_uk: 'Hobbies' });
    state.products.push(product({ id: 'p9', slug: 'produit-es', market: 'es' }), product({ id: 'p10', slug: 'inactif', active: false }));
    const urls = (await sitemap()).map((u) => u.url);
    expect(urls).toContain('https://tendpick.fr');
    expect(urls).toContain('https://tendpick.fr/casque-aliexpress');
    expect(urls).toContain('https://tendpick.fr/c/tech-gadgets');
    expect(urls).not.toContain('https://tendpick.fr/produit-es');
    expect(urls).not.toContain('https://tendpick.fr/inactif');
    expect(urls.some((u) => u.includes('/c/loisirs'))).toBe(false);
    expect(urls.some((u) => u.includes('mentions-legales') || u.includes('politique-confidentialite'))).toBe(false);
    expect(urls.every((u) => u.startsWith('https://tendpick.fr'))).toBe(true);
    // pas de blog sans article publié
    expect(urls).not.toContain('https://tendpick.fr/blog');
  });

  it('sitemap : chaque domaine annonce ses propres URL', async () => {
    state.host = 'tendpick.es';
    state.products = [product({ market: 'es', slug: 'producto' })];
    const urls = (await sitemap()).map((u) => u.url);
    expect(urls).toContain('https://tendpick.es/c/tecnologia');
    expect(urls.every((u) => u.startsWith('https://tendpick.es'))).toBe(true);
  });

  it('robots : chaque domaine annonce son sitemap, le back-office n’est jamais exploré', () => {
    state.host = 'tendpick.es';
    expect(robots().sitemap).toBe('https://tendpick.es/sitemap.xml');
    state.host = 'app.one-page-factory.com';
    expect(robots().rules).toEqual([{ userAgent: '*', disallow: '/' }]);
    state.host = 'localhost:3000';
    expect(robots().sitemap).toBeUndefined();
  });
});
