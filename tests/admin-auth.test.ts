import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  hashAdminToken,
  timingSafeStringEqual,
  isValidAdminCookie,
  isAuthorizedRequest,
} from '@/lib/admin-auth';

const ORIGINAL_ENV = { ...process.env };

function makeRequest(opts: { authHeader?: string; cookie?: string } = {}) {
  const headers = new Headers();
  if (opts.authHeader) headers.set('authorization', opts.authHeader);
  if (opts.cookie) headers.set('cookie', opts.cookie);
  return new NextRequest('http://localhost/api/test', { headers });
}

describe('timingSafeStringEqual', () => {
  it('retourne true pour deux chaines identiques', () => {
    expect(timingSafeStringEqual('abc123', 'abc123')).toBe(true);
  });

  it('retourne false pour des chaines differentes de meme longueur', () => {
    expect(timingSafeStringEqual('abc123', 'abc124')).toBe(false);
  });

  it('retourne false (sans lever) pour des longueurs differentes', () => {
    expect(timingSafeStringEqual('abc', 'abcdef')).toBe(false);
  });
});

describe('hashAdminToken / isValidAdminCookie', () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = 'test-secret-123';
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('isValidAdminCookie accepte le hash correct du secret courant', () => {
    const validHash = hashAdminToken(process.env.ADMIN_SECRET as string);
    expect(isValidAdminCookie(validHash)).toBe(true);
  });

  it('isValidAdminCookie refuse un hash incorrect', () => {
    expect(isValidAdminCookie('un-hash-invalide')).toBe(false);
  });

  it('isValidAdminCookie refuse une valeur vide ou absente', () => {
    expect(isValidAdminCookie(undefined)).toBe(false);
    expect(isValidAdminCookie(null)).toBe(false);
    expect(isValidAdminCookie('')).toBe(false);
  });
});

describe('isAuthorizedRequest', () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = 'test-secret-123';
    process.env.INTERNAL_CRON_SECRET = 'cron-secret-456';
    process.env.PIPELINE_SECRET = '';
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('refuse une requete sans cookie ni header Authorization', () => {
    const req = makeRequest();
    expect(isAuthorizedRequest(req)).toBe(false);
  });

  it('refuse un Bearer token invalide', () => {
    const req = makeRequest({ authHeader: 'Bearer token-invalide' });
    expect(isAuthorizedRequest(req)).toBe(false);
  });

  it('accepte un Bearer token correspondant a ADMIN_SECRET', () => {
    const req = makeRequest({ authHeader: 'Bearer test-secret-123' });
    expect(isAuthorizedRequest(req)).toBe(true);
  });

  it('accepte un Bearer token correspondant a INTERNAL_CRON_SECRET', () => {
    const req = makeRequest({ authHeader: 'Bearer cron-secret-456' });
    expect(isAuthorizedRequest(req)).toBe(true);
  });

  it('accepte un cookie admin_auth valide', () => {
    const validHash = hashAdminToken('test-secret-123');
    const req = makeRequest({ cookie: `admin_auth=${validHash}` });
    expect(isAuthorizedRequest(req)).toBe(true);
  });

  it('refuse un cookie admin_auth invalide', () => {
    const req = makeRequest({ cookie: 'admin_auth=un-hash-invalide' });
    expect(isAuthorizedRequest(req)).toBe(false);
  });
});
