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

  it('les anciens slugs gaming redirigent vers Jeux & Jouets', () => {
    expect(baseCategorySlug('gaming')).toBe('jeux-jouets');
    expect(baseCategorySlug('gaming-casino-paris')).toBe('jeux-jouets');
    expect(baseCategorySlug('gaming-casino-apuestas')).toBe('jeux-jouets');
    expect(baseCategorySlug('gaming-casino-betting')).toBe('jeux-jouets');
  });

  it('Jeux & Jouets et Bébé & Puériculture ont une URL par marché', () => {
    expect(categoryPath('jeux-jouets', 'fr')).toBe('/c/jeux-jouets');
    expect(categoryPath('jeux-jouets', 'es')).toBe('/c/juguetes-juegos');
    expect(categoryPath('jeux-jouets', 'uk')).toBe('/c/toys-games');
    expect(categoryPath('puericulture', 'fr')).toBe('/c/bebe-puericulture');
    expect(categoryPath('puericulture', 'es')).toBe('/c/bebe-puericultura');
    expect(categoryPath('puericulture', 'uk')).toBe('/c/baby-nursery');
    expect(baseCategorySlug('baby-nursery')).toBe('puericulture');
    expect(baseCategorySlug('juguetes-juegos')).toBe('jeux-jouets');
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
      const slugs = ['best-of-amazon', 'tech', 'mode-beaute', 'maison-deco', 'sport-bien-etre', 'jeux-jouets', 'art-design', 'loisirs', 'puericulture'].map((b) =>
        localizedCategorySlug(b, m)
      );
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });
});
