import { describe, it, expect } from 'vitest';
import { countsByProduct } from '../lib/analytics/counts';

describe('countsByProduct', () => {
  it('compte chaque produit, en parallèle par lots', async () => {
    let running = 0;
    let peak = 0;
    const calls: string[] = [];
    const countOne = async (table: string, id: string) => {
      calls.push(`${table}:${id}`);
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return { count: Number(id.slice(1)) };
    };
    const ids = Array.from({ length: 40 }, (_, i) => `p${i}`);
    const out = await countsByProduct(countOne as any, 'clicks', ids, 10);
    expect(out.size).toBe(40);
    expect(out.get('p7')).toBe(7);
    expect(peak).toBe(10); // 10 à la fois, jamais plus
    expect(calls.every((c) => c.startsWith('clicks:'))).toBe(true);
  });

  it('une erreur ou un compte nul vaut 0, les doublons sont ignorés', async () => {
    const countOne = async (_t: string, id: string) => (id === 'bad' ? { count: null, error: new Error('x') } : { count: 3 });
    const out = await countsByProduct(countOne as any, 'page_views', ['a', 'bad', 'a']);
    expect([...out.entries()]).toEqual([['a', 3], ['bad', 0]]);
  });

  it('liste vide', async () => {
    expect((await countsByProduct((async () => ({ count: 1 })) as any, 'clicks', [])).size).toBe(0);
  });
});
