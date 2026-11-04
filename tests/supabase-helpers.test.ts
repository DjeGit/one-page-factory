import { describe, it, expect } from 'vitest';
import { getClientIp, hashIp, sanitizeProductPatch, generateSlug } from '../lib/supabase';

describe('sanitizeProductPatch', () => {
  it('retire les champs en lecture seule et la jointure category', () => {
    const patch = sanitizeProductPatch({
      id: 'x', created_at: 'a', updated_at: 'b', redirect_code: 'abc', category: { id: 'c' }, sync: {}, name: 'Nouveau nom', price: 12,
    });
    expect(patch).toEqual({ name: 'Nouveau nom', price: 12 });
  });

  it('garde image_url synchronisé avec la première photo de la galerie', () => {
    expect(sanitizeProductPatch({ images: ['a.jpg', 'b.jpg'] })).toEqual({ images: ['a.jpg', 'b.jpg'], image_url: 'a.jpg' });
    expect(sanitizeProductPatch({ images: [] })).toEqual({ images: [], image_url: null });
    expect(sanitizeProductPatch({ images: ['a.jpg'], image_url: 'cover.jpg' })).toEqual({ images: ['a.jpg'], image_url: 'cover.jpg' });
  });

  it('ignore les valeurs undefined mais garde null (effacer un champ)', () => {
    expect(sanitizeProductPatch({ video_url: null, seller_name: undefined })).toEqual({ video_url: null });
  });

  it('ne modifie pas l\'objet reçu', () => {
    const input = { id: 'x', name: 'n' };
    sanitizeProductPatch(input);
    expect(input).toEqual({ id: 'x', name: 'n' });
  });
});

describe('hashIp / getClientIp', () => {
  const req = (h: Record<string, string>) => ({ headers: new Headers(h) }) as any;

  it('hash stable de 16 caractères hexadécimaux, sans l\'IP en clair', () => {
    const h = hashIp('203.0.113.7');
    expect(h).toMatch(/^[0-9a-f]{16}$/);
    expect(h).toBe(hashIp('203.0.113.7'));
    expect(h).not.toBe(hashIp('203.0.113.8'));
    expect(h).not.toContain('203');
  });

  it('première IP de x-forwarded-for, "unknown" sinon', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '198.51.100.4, 10.0.0.1' }))).toBe('198.51.100.4');
    expect(getClientIp(req({}))).toBe('unknown');
    expect(getClientIp(req({ 'x-forwarded-for': '' }))).toBe('unknown');
  });

  it('generateSlug inchangé', () => {
    expect(generateSlug('Écouteurs Bluetooth – Pro 2')).toBe('ecouteurs-bluetooth-pro-2');
  });
});

import { afterEach, beforeEach, vi } from 'vitest';
import { fetchWithTimeout, SUPABASE_FETCH_TIMEOUT_MS } from '../lib/supabase';

describe('fetchWithTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('désactive le cache de données de Next.js', async () => {
    const spy = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', spy);
    await fetchWithTimeout('https://example.supabase.co/rest/v1/products', { method: 'GET' });
    expect(spy.mock.calls[0][1]).toMatchObject({ cache: 'no-store', method: 'GET' });
  });

  it('abandonne une requête qui ne répond pas', async () => {
    vi.stubGlobal('fetch', (_u: unknown, init: RequestInit) => new Promise((_res, rej) => init.signal!.addEventListener('abort', () => rej(new Error('aborted')))));
    const p = fetchWithTimeout('https://example.supabase.co/x');
    const assertion = expect(p).rejects.toThrow('aborted');
    vi.advanceTimersByTime(SUPABASE_FETCH_TIMEOUT_MS + 1);
    await assertion;
  });

  it('respecte aussi un signal d\'annulation fourni par l\'appelant', async () => {
    vi.stubGlobal('fetch', (_u: unknown, init: RequestInit) => new Promise((_res, rej) => init.signal!.addEventListener('abort', () => rej(new Error('cancelled')))));
    const outer = new AbortController();
    const p = fetchWithTimeout('https://example.supabase.co/x', { signal: outer.signal });
    const assertion = expect(p).rejects.toThrow('cancelled');
    outer.abort();
    await assertion;
  });
});
