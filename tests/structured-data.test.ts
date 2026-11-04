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
// Fiche AliExpress avec prix daté : le seul cas où un prix est publié.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const aliexpress: any = { ...base, price: 301, price_checked_at: '2026-10-30', affiliate_url: 'https://s.click.aliexpress.com/e/x' };

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

  it("émet l'offre (sans availability) pour un prix marchand daté, et un fil d'Ariane", () => {
    // Le prix n'est publié (page ET données structurées) que s'il a une date de
    // relevé et n'est pas un prix Amazon : voir lib/pricing.ts. L'ancien test
    // fournissait un prix sans date, que le site ne montre plus nulle part.
    const html = renderToStaticMarkup(
      createElement(ProductStructuredData, {
        product: { ...aliexpress, price: 19.9, market: 'es' },
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

  it('déclare la devise de la fiche (livres) et non un euro forcé', () => {
    const html = renderToStaticMarkup(
      createElement(ProductStructuredData, { product: { ...aliexpress, price: 286, price_currency: 'GBP', market: 'uk' } })
    );
    const product = extract(html)['@graph'].find((n: { '@type': string }) => n['@type'] === 'Product');
    expect(product.offers.priceCurrency).toBe('GBP');
    expect(product.offers.price).toBe(286);
  });

  it("n'émet JAMAIS d'offre pour un prix que la fiche ne montre pas (sans date, Amazon, date invalide)", () => {
    const hidden = [
      { ...aliexpress, price_checked_at: null },
      { ...aliexpress, price_checked_at: 'pas-une-date' },
      { ...aliexpress, affiliate_url: 'https://www.amazon.fr/dp/B0TEST' },
      { ...aliexpress, price: 0 },
    ];
    for (const product of hidden) {
      const html = renderToStaticMarkup(createElement(ProductStructuredData, { product }));
      const node = extract(html)['@graph'].find((n: { '@type': string }) => n['@type'] === 'Product');
      expect(node.offers).toBeUndefined();
    }
  });

  it('ajoute FAQPage avec les questions visibles, sans les entrées vides', () => {
    const html = renderToStaticMarkup(
      createElement(ProductStructuredData, {
        product: {
          ...base,
          faq: [
            { question: 'Est-il garanti ?', answer: 'Oui, 2 ans.' },
            { question: '  ', answer: 'orpheline' },
          ],
        },
      })
    );
    const faq = extract(html)['@graph'].find((n: { '@type': string }) => n['@type'] === 'FAQPage');
    expect(faq.mainEntity).toHaveLength(1);
    expect(faq.mainEntity[0].name).toBe('Est-il garanti ?');
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('Oui, 2 ans.');
  });

  it("pas de FAQPage quand la fiche n'a pas de FAQ", () => {
    const html = renderToStaticMarkup(createElement(ProductStructuredData, { product: base }));
    expect(extract(html)['@graph'].some((n: { '@type': string }) => n['@type'] === 'FAQPage')).toBe(false);
  });
});
