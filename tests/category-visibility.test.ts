import { describe, it, expect } from 'vitest';
import { countActiveByCategory, visibleCategories } from '@/lib/category-visibility';
import type { Category } from '@/types';

const cat = (id: string, over: Partial<Category> = {}): Category => ({
  id, slug: id, name_fr: id, name_es: id, name_uk: id, icon: null, sort_order: 0, is_active: true, created_at: '', ...over,
});

describe('visibilité des catégories', () => {
  const rows = [
    { category_id: 'tech', market: 'fr' }, { category_id: 'tech', market: 'fr' }, { category_id: 'tech', market: 'uk' },
    { category_id: 'sport', market: 'es' }, { category_id: null, market: 'fr' }, { category_id: 'x', market: 'de' },
  ];
  const counts = countActiveByCategory(rows);

  it('compte les produits par catégorie et par marché, en ignorant les lignes sans catégorie ou au marché inconnu', () => {
    expect(counts).toEqual({ tech: { fr: 2, es: 0, uk: 1 }, sport: { fr: 0, es: 1, uk: 0 } });
  });

  it('une catégorie apparaît sur un marché seulement si elle y a un produit en ligne', () => {
    const all = [cat('tech'), cat('sport'), cat('vide'), cat('puericulture', { is_active: true, active_markets: ['fr', 'es', 'uk'] })];
    expect(visibleCategories(all, counts, 'fr').map((c) => c.id)).toEqual(['tech']);
    expect(visibleCategories(all, counts, 'es').map((c) => c.id)).toEqual(['sport']);
    expect(visibleCategories(all, counts, 'uk').map((c) => c.id)).toEqual(['tech']);
  });

  it('les anciens réglages (is_active, active_markets) n’ont plus aucun effet', () => {
    const all = [cat('tech', { is_active: false, active_markets: [] }), cat('vide', { is_active: true, active_markets: ['fr', 'es', 'uk'] })];
    expect(visibleCategories(all, counts, 'fr').map((c) => c.id)).toEqual(['tech']);
  });

  it('sans marché : visible dès qu’un marché a un produit', () => {
    expect(visibleCategories([cat('tech'), cat('sport'), cat('vide')], counts).map((c) => c.id)).toEqual(['tech', 'sport']);
  });
});
