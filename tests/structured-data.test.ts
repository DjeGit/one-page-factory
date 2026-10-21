import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ProductStructuredData from '@/components/landing/ProductStructuredData';

function extract(html: string) {
  const m = html.match(/<script type="application\/ld\+json">(.*)<\/script>/s);
  expect(m).not.toBeNull();
  return JSON.parse(m![1]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const base: any = { id: 'p1', slug: 'casque-test', name: 'Casque </script> test', description: 'desc', market: 'fr', image_url: null, price: null };

describe('ProductStructuredData (audit E5, E5b)', () => {
  it("n'émet pas d'offre sans prix, ni marque Tendpick, ni disponibilité codée en dur", () => {
    const html = renderToStaticMarkup(createElement(ProductStructuredData, { product: base }));
    expect(html).not.toContain('</script></script>');
    const ld = extract(html);
    const product = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'Product');
    expect(product.offers).toBeUndefined();
    expect(product.brand).toBeUndefined();
    expect(product.name).toBe('Casque </script> test');
    expect(product.url).toBe('https://tendpick.fr/casque-test');
  });

  it("émet l'offre (sans availability) quand le prix existe, et un fil d'Ariane", () => {
    const html = renderToStaticMarkup(
      createElement(ProductStructuredData, {
        product: { ...base, price: 19.9, market: 'es' },
        categoryName: 'Tecnología',
        categorySlug: 'tech',
      })
    );
    const ld = extract(html);
    const product = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'Product');
    expect(product.offers.price).toBe(19.9);
    expect(product.offers.priceCurrency).toBe('EUR');
    expect(product.offers.availability).toBeUndefined();
    const crumbs = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'BreadcrumbList');
    expect(crumbs.itemListElement.map((c: { item: string }) => c.item)).toEqual([
      'https://tendpick.es',
      'https://tendpick.es/c/tecnologia',
      'https://tendpick.es/casque-test',
    ]);
  });
});
