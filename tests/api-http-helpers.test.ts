import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  aiErrorResponse,
  cleanText,
  createRateLimiter,
  dbErrorResponse,
  getClientIp,
  intParam,
  isHttpUrl,
  isIsoDate,
  readJsonObject,
  readOptionalJsonObject,
} from '@/app/api/_lib/http';

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

function jsonReq(body: string) {
  return new Request('http://localhost/api/x', { method: 'POST', body });
}

describe('dbErrorResponse', () => {
  it('traduit les codes Postgres usuels sans fuite du message brut', async () => {
    const dup = dbErrorResponse('t', { code: '23505', message: 'duplicate key value violates unique constraint "products_slug_key"' });
    expect(dup.status).toBe(409);
    expect(JSON.stringify(await dup.json())).not.toContain('products_slug_key');
    expect(dbErrorResponse('t', { code: '23503', message: 'fk' }).status).toBe(409);
    expect(dbErrorResponse('t', { code: '22P02', message: 'invalid input syntax for type uuid' }).status).toBe(400);
    expect(dbErrorResponse('t', { code: '23502', message: 'null' }).status).toBe(400);
    expect(dbErrorResponse('t', { code: 'PGRST116', message: 'x' }).status).toBe(404);
  });

  it('erreur inconnue : 500 générique', async () => {
    const r = dbErrorResponse('t', { message: 'connection refused 10.0.0.5:5432' });
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain('10.0.0.5');
  });
});

describe('aiErrorResponse', () => {
  it('quota -> 503, clé refusée -> 502, autre -> 502, sans message fournisseur', async () => {
    expect(aiErrorResponse('t', { status: 429, message: 'sk-secret' }).status).toBe(503);
    const keyErr = aiErrorResponse('t', { status: 401, message: 'Incorrect API key sk-abcdef' });
    expect(keyErr.status).toBe(502);
    expect(JSON.stringify(await keyErr.json())).not.toContain('sk-abcdef');
    expect(aiErrorResponse('t', new Error('boom')).status).toBe(502);
  });
});

describe('lecture du corps JSON', () => {
  it('JSON illisible ou non-objet -> 400', async () => {
    const a = await readJsonObject(jsonReq('{pas du json'));
    expect('response' in a && a.response.status).toBe(400);
    const b = await readJsonObject(jsonReq('[1,2]'));
    expect('response' in b && b.response.status).toBe(400);
    const c = await readJsonObject(jsonReq('null'));
    expect('response' in c && c.response.status).toBe(400);
    const ok = await readJsonObject(jsonReq('{"a":1}'));
    expect('body' in ok && ok.body).toEqual({ a: 1 });
  });

  it('corps optionnel : vide accepté, illisible refusé', async () => {
    const empty = await readOptionalJsonObject(jsonReq(''));
    expect('body' in empty && empty.body).toEqual({});
    const bad = await readOptionalJsonObject(jsonReq('{oops'));
    expect('response' in bad && bad.response.status).toBe(400);
  });
});

describe('createRateLimiter', () => {
  it('bloque au-delà du maximum puis se réinitialise', () => {
    const l = createRateLimiter(2, 60_000);
    expect(l.allow('ip')).toBe(true);
    expect(l.allow('ip')).toBe(true);
    expect(l.allow('ip')).toBe(false);
    expect(l.allow('autre')).toBe(true);
    l.reset('ip');
    expect(l.allow('ip')).toBe(true);
  });
});

describe('getClientIp', () => {
  it('priorité cf-connecting-ip > x-real-ip > x-forwarded-for, « unknown » ignoré', () => {
    expect(getClientIp(new Headers({ 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }))).toBe('1.1.1.1');
    expect(getClientIp(new Headers({ 'x-forwarded-for': '3.3.3.3, 4.4.4.4' }))).toBe('3.3.3.3');
    expect(getClientIp(new Headers({ 'x-forwarded-for': 'unknown' }))).toBeNull();
    expect(getClientIp(new Headers())).toBeNull();
  });
});

describe('petits validateurs', () => {
  it('intParam borne et retombe sur le défaut', () => {
    expect(intParam(null, 20, 1, 50)).toBe(20);
    expect(intParam('abc', 20, 1, 50)).toBe(20);
    expect(intParam('999', 20, 1, 50)).toBe(50);
    expect(intParam('-4', 20, 1, 50)).toBe(1);
  });
  it('isIsoDate refuse les dates impossibles', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-31')).toBe(false);
    expect(isIsoDate('28/02/2026')).toBe(false);
  });
  it('isHttpUrl / cleanText', () => {
    expect(isHttpUrl('https://tendpick.fr')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(cleanText('  salut  ', 3)).toBe('sal');
    expect(cleanText('   ', 10)).toBeNull();
    expect(cleanText(5, 10)).toBeNull();
  });
});
