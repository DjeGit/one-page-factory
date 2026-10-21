import { describe, it, expect } from 'vitest';
import { baseCategorySlug, categoryAlternates, categoryPath, localizedCategorySlug } from '@/lib/category-slugs';

describe('category-slugs', () => {
  it('traduit le slug selon le marché', () => {
    expect(localizedCategorySlug('maison-deco', 'es')).toBe('hogar-decoracion');
    expect(localizedCategorySlug('maison-deco', 'uk')).toBe('home-living');
    expect(localizedCategorySlug('maison-deco', 'fr')).toBe('maison-deco');
    expect(categoryPath('tech', 'es')).toBe('/c/tecnologia');
  });

  it('garde le slug de base pour une catégorie inconnue', () => {
    expect(localizedCategorySlug('nouvelle-categorie', 'es')).toBe('nouvelle-categorie');
    expect(baseCategorySlug('nouvelle-categorie')).toBe('nouvelle-categorie');
  });

  it("retrouve le slug de base depuis n'importe quel slug de marché", () => {
    expect(baseCategorySlug('hogar-decoracion')).toBe('maison-deco');
    expect(baseCategorySlug('home-living')).toBe('maison-deco');
    expect(baseCategorySlug('maison-deco')).toBe('maison-deco');
    expect(baseCategorySlug('tech')).toBe('tech');
  });

  it('hreflang : chaque langue pointe vers sa propre URL', () => {
    const alt = categoryAlternates('maison-deco', 'es');
    expect(alt.canonical).toBe('https://tendpick.es/c/hogar-decoracion');
    expect(alt.languages.fr).toBe('https://tendpick.fr/c/maison-deco');
    expect(alt.languages.en).toBe('https://tendpick.com/c/home-living');
    expect(alt.languages['x-default']).toBe('https://tendpick.com/c/home-living');
  });

  it('les slugs traduits sont uniques par marché', () => {
    for (const m of ['fr', 'es', 'uk'] as const) {
      const slugs = ['best-of-amazon', 'tech', 'mode-beaute', 'maison-deco', 'sport-bien-etre', 'gaming', 'art-design', 'loisirs'].map((b) =>
        localizedCategorySlug(b, m)
      );
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });
});
