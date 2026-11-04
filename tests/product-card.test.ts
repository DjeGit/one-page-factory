import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ProductCard from '@/components/site/ProductCard';
import ExitIntentPopup from '@/components/landing/ExitIntentPopup';
import FreeShippingBadge from '@/components/product/FreeShippingBadge';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const product: any = {
  id: 'p1',
  slug: 'montre-garmin',
  name: 'Montre Garmin',
  hero_title: null,
  image_url: null,
  images: ['https://ae01.alicdn.com/kf/photo-1.jpg', 'https://ae01.alicdn.com/kf/photo-2.jpg'],
  affiliate_url: 'https://s.click.aliexpress.com/e/abc',
  price: 301,
  price_currency: 'EUR',
  price_checked_at: '2026-10-30',
  free_shipping: true,
  market: 'fr',
};

const render = (p = product, market: 'fr' | 'es' | 'uk' = 'fr', variant: 'boxed' | 'tile' = 'tile') =>
  renderToStaticMarkup(createElement(ProductCard, { product: p, market, variant }));

describe('ProductCard (vignette unique du site)', () => {
  for (const variant of ['boxed', 'tile'] as const) {
    it(`${variant} : prix SANS astérisque + pastille Livraison gratuite`, () => {
      const html = render(product, 'fr', variant);
      expect(html).toContain('301');
      expect(html).not.toContain('*');
      expect(html).toContain('Livraison gratuite');
      expect(html).toContain('href="/montre-garmin"');
    });
  }

  it('la photo vient de la galerie (images[0]) même sans image_url, hôte inconnu sans erreur', () => {
    const html = render();
    expect(html).toContain('photo-1.jpg');
    expect(html).not.toContain('📦');
  });

  it('sans photo : visuel de remplacement, pas d’erreur', () => {
    const html = render({ ...product, images: [], image_url: null });
    expect(html).toContain('📦');
  });

  it('sans prix daté : « Prix chez le marchand », jamais un prix inventé', () => {
    const html = render({ ...product, price_checked_at: null });
    expect(html).toContain('Prix chez le marchand');
    expect(html).not.toContain('301');
  });

  it('prix Amazon masqué', () => {
    const html = render({ ...product, affiliate_url: 'https://www.amazon.fr/dp/B0' });
    expect(html).not.toContain('301');
  });

  it('pas de pastille quand la livraison n’est pas gratuite', () => {
    expect(render({ ...product, free_shipping: false })).not.toContain('Livraison gratuite');
    expect(render({ ...product, free_shipping: null })).not.toContain('Livraison gratuite');
  });

  it('monnaie et langue du marché : £ en anglais, € en espagnol', () => {
    const uk = render({ ...product, price: 286, price_currency: 'GBP', market: 'uk' }, 'uk');
    expect(uk).toContain('£286');
    expect(uk).toContain('Free delivery');
    const es = render({ ...product, market: 'es' }, 'es');
    expect(es).toContain('€');
    expect(es).toContain('Envío gratis');
  });

  it('titre affiché : hero_title sinon nom', () => {
    expect(render({ ...product, hero_title: 'Le titre commercial' })).toContain('Le titre commercial');
    expect(render()).toContain('Montre Garmin');
  });
});

describe('FreeShippingBadge', () => {
  it('affiche le libellé fourni (petite et grande taille)', () => {
    expect(renderToStaticMarkup(createElement(FreeShippingBadge, { label: 'Envío gratis', size: 'small' }))).toContain('Envío gratis');
    expect(renderToStaticMarkup(createElement(FreeShippingBadge, { label: 'Envío gratis', sub: 'Incluido' }))).toContain('Incluido');
  });
});

describe('fenêtre de sortie', () => {
  it('se rend sans erreur dans les 3 langues (masquée tant qu’elle n’est pas déclenchée)', () => {
    for (const market of ['fr', 'es', 'uk'] as const) {
      expect(() => renderToStaticMarkup(createElement(ExitIntentPopup, { productName: 'X', redirectCode: 'abc', market }))).not.toThrow();
    }
  });
});
