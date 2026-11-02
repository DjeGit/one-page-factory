import { describe, it, expect } from 'vitest';
import { parseCat, countByCategory, productsFor, filterList, statusCounts, buildPresence, presenceOf, categoryName } from '@/lib/admin-products-view';

const cats = [
  { id: 'c-tech', slug: 'tech', name_fr: 'Tech & Gadgets', name_es: 'Tecnología', name_uk: 'Tech & Gadgets', icon: '💻', sort_order: 1 },
  { id: 'c-sport', slug: 'sport-bien-etre', name_fr: 'Sport & Bien-être', name_es: 'Deporte y Bienestar', name_uk: 'Sport & Wellness', icon: '🏋️', sort_order: 2 },
  { id: 'c-gaming', slug: 'gaming', name_fr: 'Gaming', name_es: 'Gaming', name_uk: 'Gaming', icon: '🎮', sort_order: 3 },
];
const prods = [
  { id: 'p1', name: 'Shokz OpenRun Pro 2', slug: 'shokz-openrun-pro-2', active: true, category_id: 'c-tech' },
  { id: 'p2', name: 'Écouteurs Garmin', slug: 'garmin-255', active: false, category_id: 'c-tech' },
  { id: 'p3', name: 'Tapis de yoga', slug: 'tapis-yoga', active: false, category_id: 'c-sport' },
  { id: 'p4', name: 'Sans rubrique', slug: 'divers', active: true, category_id: null },
  { id: 'p5', name: 'Rubrique inconnue', slug: 'inconnu', active: false, category_id: 'c-supprimee' },
];

describe('admin products view', () => {
  it('parseCat', () => {
    expect(parseCat(undefined)).toEqual({ kind: 'home' });
    expect(parseCat('')).toEqual({ kind: 'home' });
    expect(parseCat('all')).toEqual({ kind: 'all' });
    expect(parseCat('none')).toEqual({ kind: 'none' });
    expect(parseCat(['tech', 'x'])).toEqual({ kind: 'slug', slug: 'tech' });
  });

  it('compteurs : par catégorie, orphelins, total ; catégorie historique vide masquée', () => {
    const r = countByCategory(prods, cats, 'fr');
    expect(r.categories.map((c) => [c.slug, c.total, c.live, c.draft])).toEqual([['tech', 2, 1, 1], ['sport-bien-etre', 1, 0, 1]]);
    expect(r.categories[0]).toMatchObject({ name: 'Tech & Gadgets', icon: '💻' });
    expect(r.none).toEqual({ total: 2, live: 1, draft: 1 }); // sans catégorie + catégorie supprimée
    expect(r.all).toEqual({ total: 5, live: 2, draft: 3 });
    expect(countByCategory(prods, cats, 'es').categories[0].name).toBe('Tecnología');
    expect(categoryName(cats[1], 'uk')).toBe('Sport & Wellness');
  });

  it('catégorie historique avec des produits : reste visible', () => {
    const r = countByCategory([{ id: 'g', name: 'G', slug: 'g', active: false, category_id: 'c-gaming' }], cats, 'fr');
    expect(r.categories.map((c) => c.slug)).toContain('gaming');
  });

  it('productsFor', () => {
    expect(productsFor(prods, { kind: 'slug', slug: 'tech' }, cats).map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(productsFor(prods, { kind: 'none' }, cats).map((p) => p.id)).toEqual(['p4', 'p5']);
    expect(productsFor(prods, { kind: 'all' }, cats)).toHaveLength(5);
    expect(productsFor(prods, { kind: 'slug', slug: 'inexistante' }, cats)).toEqual([]);
  });

  it('onglets et recherche (sans accents ni casse)', () => {
    const tech = prods.slice(0, 2);
    expect(filterList(tech, 'live', '').map((p) => p.id)).toEqual(['p1']);
    expect(filterList(tech, 'draft', '').map((p) => p.id)).toEqual(['p2']);
    expect(filterList(tech, 'all', 'ECOUTEURS').map((p) => p.id)).toEqual(['p2']);
    expect(filterList(tech, 'all', 'openrun')).toHaveLength(1);
    expect(filterList(tech, 'live', 'garmin')).toEqual([]);
    expect(statusCounts(tech)).toEqual({ all: 2, live: 1, draft: 1 });
  });

  it('présence par marché : lignes reliées, ordre FR ES UK', () => {
    const map = buildPresence([
      { id: 'uk1', market: 'uk', active: false, source_product_ref: 'fr1' },
      { id: 'fr1', market: 'fr', active: true, source_product_ref: null },
      { id: 'es1', market: 'es', active: false, source_product_ref: 'fr1' },
      { id: 'solo', market: 'fr', active: false, source_product_ref: null },
    ]);
    expect(map['fr1'].map((x) => x.market)).toEqual(['fr', 'es', 'uk']);
    expect(presenceOf({ id: 'es1', source_product_ref: 'fr1' }, map)).toHaveLength(3);
    expect(presenceOf({ id: 'solo' }, map)).toEqual([{ market: 'fr', active: false }]);
    expect(presenceOf({ id: 'autre' }, map)).toEqual([]);
  });
});
