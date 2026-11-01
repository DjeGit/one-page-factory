import { describe, it, expect, vi } from 'vitest';

// Faux client Supabase en mémoire : .from('products').select().or() / .update().eq()
const rows: any[] = [];
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        or: async (expr: string) => {
          const root = expr.match(/id\.eq\.([^,]+)/)![1];
          return { data: rows.filter((r) => r.id === root || r.source_product_ref === root), error: null };
        },
      }),
      update: (patch: any) => ({
        eq: async (_c: string, id: string) => {
          Object.assign(rows.find((r) => r.id === id)!, patch);
          return { error: null };
        },
      }),
    }),
  }),
}));

import { isNeutralAliexpressUrl, publishIssues, syncActivation, getSiblings } from '@/lib/market-sync';

const row = (id: string, market: string, over: any = {}) => ({
  id, slug: `p-${market}`, market, active: false,
  affiliate_url: 'https://s.click.aliexpress.com/e/_abc', image_url: 'products/x', images: ['products/x'], source_product_ref: null, ...over,
});

describe('market-sync', () => {
  it('isNeutralAliexpressUrl', () => {
    expect(isNeutralAliexpressUrl('https://www.aliexpress.com/item/1005010644996006.html')).toBe(true);
    expect(isNeutralAliexpressUrl('https://es.aliexpress.com/item/1005010644996006.html')).toBe(true);
    expect(isNeutralAliexpressUrl('https://s.click.aliexpress.com/e/_DabCdEf')).toBe(false);
    expect(isNeutralAliexpressUrl('https://amzn.to/abc')).toBe(false);
    expect(isNeutralAliexpressUrl(null)).toBe(false);
  });

  it('publishIssues : lien et photo requis', () => {
    expect(publishIssues({ affiliate_url: 'https://s.click.aliexpress.com/e/_x', image_url: 'a', images: ['a'] })).toEqual([]);
    expect(publishIssues({ affiliate_url: '', image_url: null, images: [] })).toEqual(['lien affilié manquant', 'aucune photo']);
    expect(publishIssues({ affiliate_url: 'https://www.aliexpress.com/item/1.html', image_url: 'a', images: null })[0]).toContain('neutre');
  });

  it('activer un marché active les autres marchés prêts, signale les autres', async () => {
    rows.length = 0;
    rows.push(row('fr', 'fr', { active: true }), row('es', 'es', { source_product_ref: 'fr' }), row('uk', 'uk', { source_product_ref: 'fr', images: [], image_url: null }));
    const r = await syncActivation({ id: 'fr', source_product_ref: null }, true);
    expect(r.activated.map((x) => x.market)).toEqual(['es']);
    expect(r.skipped.map((x) => [x.market, x.reasons])).toEqual([['uk', ['aucune photo']]]);
    expect(rows.find((x) => x.id === 'uk')!.active).toBe(false);
  });

  it('depuis un marché non racine, les autres (dont la racine) suivent ; désactiver propage à tous', async () => {
    rows.length = 0;
    rows.push(row('fr', 'fr', { active: true }), row('es', 'es', { source_product_ref: 'fr', active: true }), row('uk', 'uk', { source_product_ref: 'fr', active: true }));
    expect((await getSiblings({ id: 'uk', source_product_ref: 'fr' })).map((x) => x.id).sort()).toEqual(['es', 'fr']);
    const r = await syncActivation({ id: 'es', source_product_ref: 'fr' }, false);
    expect(r.deactivated.map((x) => x.market).sort()).toEqual(['fr', 'uk']);
    expect(rows.filter((x) => x.id !== 'es').every((x) => x.active === false)).toBe(true); // le produit d'origine est mis à jour par la route elle-même
  });

  it('produit sans autre marché : rien ne se passe', async () => {
    rows.length = 0;
    rows.push(row('solo', 'fr'));
    const r = await syncActivation({ id: 'solo', source_product_ref: null }, true);
    expect(r).toEqual({ activated: [], deactivated: [], skipped: [] });
  });
});
