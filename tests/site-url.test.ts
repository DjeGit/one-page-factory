import { describe, it, expect } from 'vitest';
import {
  MARKET_ORIGIN,
  buildAlternates,
  getRequestHost,
  getRequestOrigin,
  hasIndexBlockingParams,
  isBackofficeHost,
  isTendpickHost,
  marketUrl,
} from '@/lib/site-url';
import { serializeJsonLd } from '@/lib/json-ld';

const hdr = (map: Record<string, string>) => ({ get: (k: string) => map[k.toLowerCase()] ?? null });

describe('site-url (audit SEO C1/C2)', () => {
  it('donne une origine par marché', () => {
    expect(MARKET_ORIGIN).toEqual({ fr: 'https://tendpick.fr', es: 'https://tendpick.es', uk: 'https://tendpick.com' });
    expect(marketUrl('es', '/c/maison')).toBe('https://tendpick.es/c/maison');
    expect(marketUrl('fr', '/')).toBe('https://tendpick.fr');
  });

  it('préfère x-forwarded-host et retire le port', () => {
    expect(getRequestHost(hdr({ host: '127.0.0.1:3000', 'x-forwarded-host': 'Tendpick.es' }))).toBe('tendpick.es');
    expect(getRequestHost(hdr({ host: 'tendpick.fr:443' }))).toBe('tendpick.fr');
  });

  it('reconnaît les domaines Tendpick et le back-office', () => {
    expect(isTendpickHost('tendpick.fr')).toBe(true);
    expect(isTendpickHost('www.tendpick.com')).toBe(true);
    expect(isTendpickHost('localhost')).toBe(false);
    expect(isTendpickHost('tendpick.fr.evil.com')).toBe(false);
    expect(isBackofficeHost('app.one-page-factory.com')).toBe(true);
  });

  it("le canonical suit le domaine visité, jamais NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://tendpick.com';
    expect(getRequestOrigin(hdr({ host: 'tendpick.fr' }))).toBe('https://tendpick.fr');
    expect(getRequestOrigin(hdr({ host: 'www.tendpick.es' }))).toBe('https://tendpick.es');
  });

  it('hors domaine Tendpick, repli sur la variable d’environnement', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000/';
    expect(getRequestOrigin(hdr({ host: 'localhost:3000' }))).toBe('http://localhost:3000');
    expect(buildAlternates(hdr({ host: 'localhost:3000' }), '/blog')).toEqual({ canonical: 'http://localhost:3000/blog' });
  });

  it('génère canonical + hreflang réciproques et x-default', () => {
    const alt = buildAlternates(hdr({ host: 'tendpick.es' }), '/produits');
    expect(alt.canonical).toBe('https://tendpick.es/produits');
    expect(alt.languages).toEqual({
      fr: 'https://tendpick.fr/produits',
      es: 'https://tendpick.es/produits',
      en: 'https://tendpick.com/produits',
      'x-default': 'https://tendpick.com/produits',
    });
    expect(buildAlternates(hdr({ host: 'tendpick.com' }), '/').canonical).toBe('https://tendpick.com/');
  });

  it('détecte les paramètres qui bloquent l’indexation', () => {
    expect(hasIndexBlockingParams({ q: 'casque' }, ['q'])).toBe(true);
    expect(hasIndexBlockingParams({ q: '  ' }, ['q'])).toBe(false);
    expect(hasIndexBlockingParams({}, ['q'])).toBe(false);
    expect(hasIndexBlockingParams(undefined, ['q'])).toBe(false);
  });
});

describe('serializeJsonLd (audit E5)', () => {
  it('neutralise </script> sans changer le JSON une fois parsé', () => {
    const data = { name: 'Casque </script><script>alert(1)</script>' };
    const out = serializeJsonLd(data);
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual(data);
  });
});
