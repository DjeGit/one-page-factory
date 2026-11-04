import { describe, it, expect } from 'vitest';
import { SITE_COPY } from '@/lib/site-copy';
import { PAGES_COPY } from '@/lib/pages-copy';
import { LEGAL_COPY } from '@/lib/legal-copy';
import { CONSENT_COPY } from '@/lib/consent-copy';

const MARKETS = ['fr', 'es', 'uk'] as const;

/** Liste « chemin -> type » de toutes les clés d'un objet de textes (fonctions comprises). */
function shape(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [`${prefix}[]`];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => shape(v, prefix ? `${prefix}.${k}` : k));
  }
  return [`${prefix}:${typeof value}`];
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('textes des 3 marchés (fr / es / en)', () => {
  it('SITE_COPY : mêmes clés dans les 3 langues, aucun texte vide', () => {
    const ref = shape(SITE_COPY.fr);
    for (const m of MARKETS) {
      expect(shape(SITE_COPY[m])).toEqual(ref);
      expect(strings(SITE_COPY[m]).filter((s) => s.trim() === '')).toEqual([]);
    }
  });

  it('les fenêtres surgissantes sont traduites (plus de français sur .es / .com)', () => {
    expect(SITE_COPY.es.popups.exit.title).not.toBe(SITE_COPY.fr.popups.exit.title);
    expect(SITE_COPY.uk.popups.exit.title).not.toBe(SITE_COPY.fr.popups.exit.title);
    expect(SITE_COPY.uk.popups.email.title(10)).toContain('10%');
  });

  it('chaque marché a son format de prix et sa note « prix à confirmer » avec la date', () => {
    expect(SITE_COPY.fr.product.priceNote('30 octobre 2026')).toContain('30 octobre 2026');
    expect(SITE_COPY.es.product.priceNote('30 de octubre de 2026')).toContain('30 de octubre de 2026');
    expect(SITE_COPY.uk.product.priceNote('30 October 2026')).toContain('30 October 2026');
    expect(SITE_COPY.fr.product.locale).toBe('fr-FR');
    expect(SITE_COPY.es.product.locale).toBe('es-ES');
    expect(SITE_COPY.uk.product.locale).toBe('en-GB');
  });

  it('pages éditoriales et légales présentes dans les 3 langues, avec titre, description et contenu', () => {
    for (const m of MARKETS) {
      for (const key of ['about', 'method', 'contact', 'partners'] as const) {
        const c = PAGES_COPY[m][key];
        expect(c.h1.length).toBeGreaterThan(3);
        expect(c.metaTitle.length).toBeGreaterThan(3);
        expect(c.metaDescription.length).toBeGreaterThan(20);
        expect(c.sections.length).toBeGreaterThan(0);
      }
      for (const key of ['legal', 'privacy'] as const) {
        const c = LEGAL_COPY[m][key];
        expect(c.h1.length).toBeGreaterThan(3);
        expect(c.metaDescription.length).toBeGreaterThan(20);
        expect(c.sections.length).toBeGreaterThan(2);
      }
    }
  });

  it('bandeau d’affiliation et cookies dans les 3 langues', () => {
    for (const m of MARKETS) {
      expect(CONSENT_COPY[m].disclosureBanner.length).toBeGreaterThan(20);
      expect(CONSENT_COPY[m].cookieBanner.accept.length).toBeGreaterThan(1);
      expect(CONSENT_COPY[m].cookieBanner.decline.length).toBeGreaterThan(1);
    }
  });
});
