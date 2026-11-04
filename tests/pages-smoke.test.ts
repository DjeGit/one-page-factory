import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// ── Faux environnement Next + base de données (aucun appel réseau) ──────────
const state = vi.hoisted(() => ({
  host: 'tendpick.fr',
  products: [] as Record<string, unknown>[],
  categories: [] as Record<string, unknown>[],
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
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'select', 'eq', 'is', 'not', 'in', 'limit', 'order', 'neq']) chain[m] = () => chain;
  chain.maybeSingle = async () => ({ data: null, error: null });
  chain.single = async () => ({ data: null, error: null });
  const visible = (market: string) =>
    state.categories.filter((c) => state.products.some((p) => p.category_id === c.id && p.market === market && p.active));
  return {
    getSupabaseAdmin: () => chain,
    getProduct: async (slug: string) => state.products.find((p) => p.slug === slug && p.active) ?? null,
    getActiveCategories: async (market: string) => visible(market),
    getCategoryBySlug: async (slug: string) => state.categories.find((c) => c.slug === slug) ?? null,
    getActiveProductsByCategory: async (id: string, market: string) =>
      state.products.filter((p) => p.category_id === id && p.market === market && p.active),
    getProductsByIds: async () => [],
  };
});
vi.mock('@/lib/site-products', async (orig) => {
  const real = await orig<typeof import('@/lib/site-products')>();
  return { ...real, getMarketCatalog: async (market: string) => state.products.filter((p) => p.market === market && p.active) };
});

import ProductPage, { generateMetadata as productMetadata } from '@/app/[slug]/page';
import CategoryPage, { generateMetadata as categoryMetadata } from '@/app/c/[slug]/page';

const category = { id: 'c-tech', slug: 'tech', name_fr: 'Tech & Gadgets', name_es: 'Tecnología', name_uk: 'Tech & Gadgets', icon: null };

function product(over: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    slug: 'montre-garmin',
    name: 'Montre Garmin Forerunner 265',
    description: 'Une montre GPS.\n\nAutonomie de 13 jours.',
    market: 'fr',
    active: true,
    category_id: 'c-tech',
    affiliate_url: 'https://s.click.aliexpress.com/e/abc',
    redirect_code: 'abc123',
    price: 301,
    price_currency: 'EUR',
    price_checked_at: '2026-10-30',
    free_shipping: true,
    image_url: null,
    images: ['https://ae01.alicdn.com/kf/a.jpg', 'https://ae01.alicdn.com/kf/b.jpg'],
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    seller_name: 'Garmin Store',
    benefits: [{ icon: '⚡', title: 'GPS précis', description: 'Multi-bandes' }],
    faq: [{ question: 'Est-elle garantie ?', answer: 'Oui, 2 ans.' }],
    hero_title: null,
    hero_subtitle: null,
    exit_intent_enabled: true,
    ...over,
  };
}

async function renderProduct(slug: string) {
  const el = await ProductPage({ params: { slug } });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  state.host = 'tendpick.fr';
  state.categories = [category];
  state.products = [product()];
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')));
});

describe('fiche produit', () => {
  it('affiche prix daté avec astérisque, mention, livraison gratuite, vidéo, FAQ et avertissement d’affiliation', async () => {
    const html = await renderProduct('montre-garmin');
    expect(html).toContain('301');
    expect(html).toMatch(/301[^<]*\*/);
    expect(html).toContain('Prix à confirmer avec le revendeur');
    expect(html).toContain('30 octobre 2026');
    expect(html).toContain('Livraison gratuite');
    expect(html).toContain('Frais de port offerts');
    expect(html).toContain('En vidéo');
    expect(html).toContain('Est-elle garantie ?');
    expect(html).toContain('liens affiliés'); // bandeau d'avertissement
    expect(html).toContain('Garmin Store');
    expect(html).toContain('application/ld+json');
  });

  it('tous les liens vers le marchand portent rel="sponsored nofollow noopener"', async () => {
    const html = await renderProduct('montre-garmin');
    const goLinks = html.match(/<a [^>]*href="\/api\/go\/[^"]*"[^>]*>/g) ?? [];
    expect(goLinks.length).toBeGreaterThan(0);
    for (const a of goLinks) expect(a).toContain('rel="sponsored nofollow noopener"');
  });

  it('plus de prix barré ni de pourcentage de remise (décision du 30/10)', async () => {
    state.products = [product({ original_price: 500 })];
    const html = await renderProduct('montre-garmin');
    expect(html).not.toContain('line-through');
    expect(html).not.toContain('-40 %');
  });

  it('sans prix daté : aucun prix, aucune mention de prix à confirmer', async () => {
    state.products = [product({ price_checked_at: null })];
    const html = await renderProduct('montre-garmin');
    expect(html).not.toContain('Prix à confirmer');
    expect(html).not.toContain('301,00');
  });

  it('sans photo, sans prix, sans vidéo, sans FAQ : la fiche s’affiche quand même', async () => {
    state.products = [
      product({ images: [], image_url: null, price: null, video_url: null, faq: [], benefits: [], description: null, category_id: null, free_shipping: false }),
    ];
    const html = await renderProduct('montre-garmin');
    expect(html).toContain('Photo à venir');
    expect(html).not.toContain('En vidéo');
    expect(html).not.toContain('Questions fréquentes');
    expect(html).not.toContain('Livraison gratuite');
  });

  it('liste « Vous aimerez aussi » : vignettes sans astérisque', async () => {
    state.products = [
      product(),
      product({ id: 'p2', slug: 'autre', name: 'Autre montre', price: 99, redirect_code: 'zzz999' }),
    ];
    const html = await renderProduct('montre-garmin');
    const related = html.slice(html.indexOf('Vous aimerez aussi'));
    expect(related).toContain('99');
    expect(related).not.toContain('*');
    expect(related).toContain('Livraison gratuite');
  });

  it('produit inconnu ou inactif : 404', async () => {
    await expect(renderProduct('inconnu')).rejects.toThrow('NEXT_NOT_FOUND');
    state.products = [product({ active: false })];
    await expect(renderProduct('montre-garmin')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('une fiche d’un autre marché redirige vers son domaine', async () => {
    state.host = 'tendpick.es';
    await expect(renderProduct('montre-garmin')).rejects.toThrow('REDIRECT:https://tendpick.fr/montre-garmin');
  });

  it('texte en espagnol et en anglais selon le marché du produit', async () => {
    state.host = 'tendpick.es';
    state.products = [product({ market: 'es' })];
    const es = await renderProduct('montre-garmin');
    expect(es).toContain('Envío gratis');
    expect(es).toContain('Precio por confirmar');
    state.host = 'tendpick.com';
    state.products = [product({ market: 'uk', price: 286, price_currency: 'GBP' })];
    const uk = await renderProduct('montre-garmin');
    expect(uk).toContain('£286');
    expect(uk).toContain('Free delivery');
  });

  it('métadonnées : canonical du marché, description coupée, image par défaut si pas de photo', async () => {
    const long = 'mot '.repeat(200);
    state.products = [product({ description: long, images: [], image_url: null })];
    const md = await productMetadata({ params: { slug: 'montre-garmin' } });
    expect(md.alternates?.canonical).toBe('https://tendpick.fr/montre-garmin');
    expect((md.description as string).length).toBeLessThanOrEqual(160);
    expect(md.openGraph).not.toHaveProperty('images');
    const nf = await productMetadata({ params: { slug: 'inconnu' } });
    expect(nf.title).toBe('Produit introuvable');
    state.host = 'tendpick.com';
    expect((await productMetadata({ params: { slug: 'inconnu' } })).title).toBe('Product not found');
  });
});

describe('pages catégorie', () => {
  const render = async (slug: string) => renderToStaticMarkup(await CategoryPage({ params: { slug } }));

  it('catégorie avec produit : liste de vignettes + fil d’Ariane structuré', async () => {
    const html = await render('tech-gadgets');
    expect(html).toContain('Montre Garmin Forerunner 265');
    expect(html).toContain('BreadcrumbList');
  });

  it('catégorie VIDE sur ce marché : 404 (pas de page « bientôt disponible » à indexer)', async () => {
    state.host = 'tendpick.es';
    await expect(render('tecnologia')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('slug inconnu : 404', async () => {
    await expect(render('n-importe-quoi')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('anciens slugs : redirection permanente vers la catégorie du marché', async () => {
    state.categories = [category, { id: 'c-jeux', slug: 'jeux-jouets', name_fr: 'Jeux & Jouets', name_es: 'Juguetes y juegos', name_uk: 'Toys & Games', icon: null }];
    state.products = [product({ category_id: 'c-jeux' }), product({ id: 'p9', slug: 'jouet-es', market: 'es', category_id: 'c-jeux' })];
    await expect(render('gaming')).rejects.toThrow('REDIRECT:/c/jeux-jouets');
    await expect(render('gaming-casino-paris')).rejects.toThrow('REDIRECT:/c/jeux-jouets');
    // slug d'un autre marché sur le domaine français
    await expect(render('juguetes-juegos')).rejects.toThrow('REDIRECT:/c/jeux-jouets');
    state.host = 'tendpick.es';
    await expect(render('gaming')).rejects.toThrow('REDIRECT:/c/juguetes-juegos');
    // le bon slug répond normalement
    expect(await render('juguetes-juegos')).toContain('jouet-es');
  });

  it('hreflang : seulement les marchés qui ont un produit dans la catégorie', async () => {
    state.products = [product(), product({ id: 'p2', slug: 'p-uk', market: 'uk' })];
    const md = await categoryMetadata({ params: { slug: 'tech-gadgets' } });
    const langs = md.alternates?.languages as Record<string, string>;
    expect(Object.keys(langs).sort()).toEqual(['en', 'fr', 'x-default']);
    expect(langs.fr).toBe('https://tendpick.fr/c/tech-gadgets');
    expect(langs.en).toBe('https://tendpick.com/c/tech-gadgets');
    expect(md.alternates?.canonical).toBe('https://tendpick.fr/c/tech-gadgets');
  });
});
