import { describe, it, expect } from 'vitest';
import { toMetaDescription } from '@/lib/seo-text';

describe('toMetaDescription', () => {
  it('renvoie undefined pour un texte vide', () => {
    expect(toMetaDescription(null)).toBeUndefined();
    expect(toMetaDescription('  \n ')).toBeUndefined();
  });
  it('réduit les sauts de ligne multiples', () => {
    expect(toMetaDescription('Premier paragraphe.\n\nSecond   paragraphe.')).toBe('Premier paragraphe. Second paragraphe.');
  });
  it('coupe sur un mot à ~160 caractères avec une ellipse', () => {
    const long = 'mot '.repeat(100);
    const out = toMetaDescription(long) as string;
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
  it('laisse un texte court intact', () => {
    expect(toMetaDescription('Court et bon.')).toBe('Court et bon.');
  });
});
