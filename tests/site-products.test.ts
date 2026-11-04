import { describe, it, expect } from 'vitest';
import { isPlausibleSlug, normalizeSearch, searchProducts } from '@/lib/site-products';

const list = [
  { name: 'Écouteurs sans fil Pro', hero_title: 'Le son sans câble' },
  { name: 'Montre connectée Garmin Forerunner 265', hero_title: null },
  { name: 'Poussette légère', hero_title: 'Bébé voyage' },
];

describe('recherche catalogue (en mémoire)', () => {
  it('ignore accents et casse', () => {
    expect(normalizeSearch('  ÉCOUTEURS,  Pro! ')).toBe('ecouteurs pro');
    expect(searchProducts(list, 'ecouteurs')).toHaveLength(1);
    expect(searchProducts(list, 'ÉCOUTEURS')).toHaveLength(1);
  });
  it('tous les mots doivent être présents (nom ou titre affiché)', () => {
    expect(searchProducts(list, 'garmin 265')).toHaveLength(1);
    expect(searchProducts(list, 'garmin poussette')).toHaveLength(0);
    expect(searchProducts(list, 'bebe')).toHaveLength(1);
  });
  it('requête vide ou ponctuation seule : tout le catalogue', () => {
    expect(searchProducts(list, '')).toHaveLength(3);
    expect(searchProducts(list, ' ,;() ')).toHaveLength(3);
  });
  it('une saisie hostile n’a aucun effet particulier', () => {
    expect(searchProducts(list, "x%',name.eq.a),(")).toHaveLength(0);
    expect(() => searchProducts([{ name: undefined as never, hero_title: null }], 'a')).not.toThrow();
  });
});

describe('isPlausibleSlug (robots qui devinent des chemins)', () => {
  it('accepte les slugs de fiche', () => {
    expect(isPlausibleSlug('montre-garmin-forerunner-265')).toBe(true);
    expect(isPlausibleSlug('produit-1730000000000')).toBe(true);
  });
  it('refuse les chemins qui ne peuvent pas être une fiche, sans toucher à la base', () => {
    for (const s of ['wp-login.php', 'apple-touch-icon.png', '.env', 'a/b', '%2e%2e', '', 'x'.repeat(201)]) {
      expect(isPlausibleSlug(s)).toBe(false);
    }
  });
});
