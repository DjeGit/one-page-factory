import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { hashAdminToken } from '@/lib/admin-auth';

const ORIGINAL_ENV = { ...process.env };
let nextIp = 100;

function loginReq(body: unknown, ip?: string) {
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.set('cf-connecting-ip', ip ?? `10.0.0.${nextIp++}`);
  return new NextRequest('http://localhost/api/admin/login', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/admin/login', () => {
  beforeEach(() => {
    vi.resetModules(); // limiteurs en mémoire remis à zéro
    process.env.ADMIN_SECRET = 'mot-de-passe-de-test';
  });
  afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

  it('bon mot de passe : 200 et cookie de session httpOnly', async () => {
    const { POST } = await import('@/app/api/admin/login/route');
    const res = await POST(loginReq({ password: 'mot-de-passe-de-test' }));
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`admin_auth=${hashAdminToken('mot-de-passe-de-test')}`);
    expect(cookie.toLowerCase()).toContain('httponly');
  });

  it('mauvais mot de passe : 401 sans cookie', async () => {
    const { POST } = await import('@/app/api/admin/login/route');
    const res = await POST(loginReq({ password: 'faux' }));
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('corps illisible ou mot de passe non texte : 400 / 401, jamais 500', async () => {
    const { POST } = await import('@/app/api/admin/login/route');
    expect((await POST(loginReq('{pas du json'))).status).toBe(400);
    expect((await POST(loginReq({ password: { $ne: '' } }))).status).toBe(401);
    expect((await POST(loginReq({}))).status).toBe(401);
  });

  it('6e essai depuis la même IP : 429, même avec le bon mot de passe', async () => {
    const { POST } = await import('@/app/api/admin/login/route');
    for (let i = 0; i < 5; i++) expect((await POST(loginReq({ password: 'faux' }, '9.9.9.9'))).status).toBe(401);
    expect((await POST(loginReq({ password: 'mot-de-passe-de-test' }, '9.9.9.9'))).status).toBe(429);
  });

  it('production sans ADMIN_SECRET : 503, aucun mot de passe par défaut accepté', async () => {
    delete process.env.ADMIN_SECRET;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { POST } = await import('@/app/api/admin/login/route');
    const res = await POST(loginReq({ password: 'changeme' }));
    expect(res.status).toBe(503);
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});
