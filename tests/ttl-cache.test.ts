import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ttlCache, invalidateTtlCache, STALE_MAX_MS } from '../lib/ttl-cache';

describe('ttlCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    invalidateTtlCache();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('garde la valeur pendant le TTL puis recharge', async () => {
    const loader = vi.fn().mockResolvedValueOnce(['a']).mockResolvedValueOnce(['b']);
    expect(await ttlCache('k', 1000, loader)).toEqual(['a']);
    expect(await ttlCache('k', 1000, loader)).toEqual(['a']);
    vi.advanceTimersByTime(1001);
    expect(await ttlCache('k', 1000, loader)).toEqual(['b']);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('partage une seule requête entre appels simultanés', async () => {
    const loader = vi.fn(() => new Promise<string>((r) => setTimeout(() => r('x'), 10)));
    const p = Promise.all([ttlCache('s', 1000, loader), ttlCache('s', 1000, loader)]);
    vi.advanceTimersByTime(20);
    expect(await p).toEqual(['x', 'x']);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('un résultat vide n\'est gardé que 5 s', async () => {
    const loader = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(['ok']);
    expect(await ttlCache('e', 60_000, loader)).toEqual([]);
    vi.advanceTimersByTime(5_001);
    expect(await ttlCache('e', 60_000, loader)).toEqual(['ok']);
  });

  it('invalidateTtlCache : la modification est visible tout de suite', async () => {
    const loader = vi.fn().mockResolvedValueOnce(['avant']).mockResolvedValueOnce(['apres']);
    expect(await ttlCache('i', 60_000, loader)).toEqual(['avant']);
    invalidateTtlCache();
    expect(await ttlCache('i', 60_000, loader)).toEqual(['apres']);
  });

  it('invalidation par préfixe : les autres clés restent en cache', async () => {
    const a = vi.fn().mockResolvedValue(['a']);
    const b = vi.fn().mockResolvedValue(['b']);
    await ttlCache('categories:all', 60_000, a);
    await ttlCache('blog:latest', 60_000, b);
    invalidateTtlCache('categories:');
    await ttlCache('categories:all', 60_000, a);
    await ttlCache('blog:latest', 60_000, b);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('un chargement démarré avant l\'invalidation ne réécrit pas sa valeur périmée', async () => {
    let release!: (v: string[]) => void;
    const slow = vi.fn(() => new Promise<string[]>((r) => (release = r)));
    const first = ttlCache('race', 60_000, slow);
    invalidateTtlCache(); // écriture admin pendant le chargement
    release(['ancienne']);
    expect(await first).toEqual(['ancienne']);
    const fresh = vi.fn().mockResolvedValue(['nouvelle']);
    expect(await ttlCache('race', 60_000, fresh)).toEqual(['nouvelle']);
  });

  it('panne du rechargement : ressert la dernière valeur connue, puis réessaie', async () => {
    const loader = vi.fn().mockResolvedValueOnce(['bonne']).mockRejectedValueOnce(new Error('panne')).mockResolvedValueOnce(['revenue']);
    expect(await ttlCache('p', 1000, loader)).toEqual(['bonne']);
    vi.advanceTimersByTime(1001);
    expect(await ttlCache('p', 1000, loader)).toEqual(['bonne']); // panne -> valeur précédente
    expect(await ttlCache('p', 1000, loader)).toEqual(['bonne']); // répit de 5 s : pas de nouvel appel
    expect(loader).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(5_001);
    expect(await ttlCache('p', 1000, loader)).toEqual(['revenue']);
  });

  it('panne sans valeur connue (ou trop vieille) : l\'erreur remonte', async () => {
    await expect(ttlCache('x', 1000, () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    const ok = vi.fn().mockResolvedValueOnce(['v']).mockRejectedValueOnce(new Error('boom2'));
    await ttlCache('old', 1000, ok);
    vi.advanceTimersByTime(STALE_MAX_MS + 2000);
    await expect(ttlCache('old', 1000, ok)).rejects.toThrow('boom2');
  });
});
