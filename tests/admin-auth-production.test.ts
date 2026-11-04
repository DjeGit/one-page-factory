import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  getAdminSecret,
  hashAdminToken,
  isAuthorizedAdminOrInternal,
  isAuthorizedRequest,
  isValidAdminCookie,
} from '@/lib/admin-auth';

const ORIGINAL_ENV = { ...process.env };
// process.env est réaffecté après chaque test : on le relit à chaque accès.
const env = new Proxy({} as Record<string, string | undefined>, {
  get: (_t, k: string) => process.env[k],
  set: (_t, k: string, v) => { (process.env as Record<string, string | undefined>)[k] = v; return true; },
  deleteProperty: (_t, k: string) => { delete (process.env as Record<string, string | undefined>)[k]; return true; },
});

function req(opts: { bearer?: string; cookie?: string } = {}) {
  const headers = new Headers();
  if (opts.bearer) headers.set('authorization', `Bearer ${opts.bearer}`);
  if (opts.cookie) headers.set('cookie', opts.cookie);
  return new NextRequest('http://localhost/api/test', { headers });
}

describe('ADMIN_SECRET en production', () => {
  beforeEach(() => {
    delete env.ADMIN_SECRET;
    delete env.INTERNAL_CRON_SECRET;
    delete env.PIPELINE_SECRET;
    delete env.INTERNAL_API_KEY;
  });
  afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

  it('absent en production : pas de secret par défaut, tout accès refusé', () => {
    env.NODE_ENV = 'production';
    expect(getAdminSecret()).toBeNull();
    // Ni le mot de passe par défaut historique, ni son hash ne donnent accès.
    expect(isValidAdminCookie(hashAdminToken('changeme'))).toBe(false);
    expect(isAuthorizedRequest(req({ cookie: `admin_auth=${hashAdminToken('changeme')}` }))).toBe(false);
    expect(isAuthorizedRequest(req({ bearer: 'changeme' }))).toBe(false);
  });

  it('absent hors production : valeur de développement conservée', () => {
    env.NODE_ENV = 'development';
    expect(getAdminSecret()).toBe('changeme');
  });

  it('défini : utilisé tel quel', () => {
    env.NODE_ENV = 'production';
    env.ADMIN_SECRET = 'un-vrai-secret';
    expect(getAdminSecret()).toBe('un-vrai-secret');
    expect(isAuthorizedRequest(req({ cookie: `admin_auth=${hashAdminToken('un-vrai-secret')}` }))).toBe(true);
  });
});

describe('isAuthorizedAdminOrInternal', () => {
  beforeEach(() => {
    env.NODE_ENV = 'production';
    env.ADMIN_SECRET = 'admin-secret';
    delete env.INTERNAL_API_KEY;
  });
  afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

  it('accepte le cookie admin et le secret admin', () => {
    expect(isAuthorizedAdminOrInternal(req({ cookie: `admin_auth=${hashAdminToken('admin-secret')}` }))).toBe(true);
    expect(isAuthorizedAdminOrInternal(req({ bearer: 'admin-secret' }))).toBe(true);
  });

  it('accepte INTERNAL_API_KEY seulement si elle est définie', () => {
    expect(isAuthorizedAdminOrInternal(req({ bearer: 'cle-interne' }))).toBe(false);
    env.INTERNAL_API_KEY = 'cle-interne';
    expect(isAuthorizedAdminOrInternal(req({ bearer: 'cle-interne' }))).toBe(true);
    expect(isAuthorizedAdminOrInternal(req({ bearer: 'autre' }))).toBe(false);
  });

  it('clé interne absente : un en-tête vide ne donne PAS accès', () => {
    expect(isAuthorizedAdminOrInternal(req())).toBe(false);
  });
});
