import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { recordVisit } from '../lib/visitor-store';
import { resetRpcState } from '../lib/analytics/stats';

const visit = {
  visitorId: '11111111-1111-4111-8111-111111111111',
  market: 'fr',
  sessionId: 'sess-12345',
  path: '/produits',
  pageType: 'catalog',
  referrerHost: null,
  newSession: true,
};

describe('recordVisit', () => {
  beforeEach(() => {
    resetRpcState();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('avec la migration : un seul appel atomique', async () => {
    const sb = { rpc: vi.fn().mockResolvedValue({ data: 'visit-1', error: null }), from: vi.fn() } as any;
    expect(await recordVisit(sb, visit)).toBe('visit-1');
    expect(sb.from).not.toHaveBeenCalled();
    expect(sb.rpc).toHaveBeenCalledWith('opf_record_visit', expect.objectContaining({ p_visitor_id: visit.visitorId, p_new_session: true, p_page_type: 'catalog' }));
  });

  function legacyClient(known: { visit_count: number } | null, insertVisitorError: unknown = null) {
    const calls: string[] = [];
    const sb = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } }),
      from: vi.fn((table: string) => {
        const b: any = {
          select: () => b,
          eq: () => b,
          maybeSingle: async () => ({ data: known, error: null }),
          insert: (row: unknown) => {
            calls.push(`insert ${table} ${JSON.stringify(row)}`);
            if (table === 'visitors') return Promise.resolve({ error: insertVisitorError });
            return { select: () => ({ single: async () => ({ data: { id: 'visit-legacy' }, error: null }) }) };
          },
          update: (row: any) => {
            calls.push(`update ${table} ${row.visit_count}`);
            return { eq: async () => ({ error: null }) };
          },
        };
        return b;
      }),
    } as any;
    return { sb, calls };
  }

  it('sans la migration : visiteur connu, +1 visite seulement en début de session', async () => {
    const { sb, calls } = legacyClient({ visit_count: 4 });
    expect(await recordVisit(sb, visit)).toBe('visit-legacy');
    expect(calls).toContain('update visitors 5');
    resetRpcState();
    const again = legacyClient({ visit_count: 4 });
    await recordVisit(again.sb, { ...visit, newSession: false });
    expect(again.calls).toContain('update visitors 4');
  });

  it('sans la migration : « clé en double » à la création du visiteur n\'est pas une panne', async () => {
    const { sb } = legacyClient(null, { code: '23505', message: 'duplicate key' });
    expect(await recordVisit(sb, visit)).toBe('visit-legacy');
  });

  it('sans la migration : une vraie erreur à la création du visiteur remonte', async () => {
    const { sb } = legacyClient(null, { code: '42501', message: 'permission denied' });
    await expect(recordVisit(sb, visit)).rejects.toMatchObject({ code: '42501' });
  });
});
