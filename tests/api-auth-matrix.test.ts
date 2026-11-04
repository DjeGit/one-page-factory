/**
 * Matrice d'authentification des routes d'administration : sans cookie ni jeton,
 * chacune doit répondre 401 AVANT de toucher la base. Plusieurs de ces routes étaient
 * ouvertes à n'importe quel visiteur avant l'audit (export des leads, étude de marché,
 * statistiques, meilleurs produits, score de santé, statistiques de clics…).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Routes historiques « Keepa » : leur module de base Postgres exige DATABASE_URL dès l'import.
vi.mock('@/lib/db', () => ({ query: vi.fn(), withTransaction: vi.fn() }));

const ORIGINAL_ENV = { ...process.env };

type Case = [route: string, method: string, params?: Record<string, string>];

const UUID = '11111111-1111-4111-8111-111111111111';

const CASES: Case[] = [
  ['leads/route', 'GET'],
  ['leads/export/route', 'GET'],
  ['leads/[id]/route', 'DELETE', { id: UUID }],
  ['leads/[id]/send-email/route', 'POST', { id: UUID }],
  ['market/route', 'GET'],
  ['market/route', 'POST'],
  ['market/[id]/route', 'PUT', { id: UUID }],
  ['market/refresh/route', 'GET'],
  ['market/refresh/route', 'POST'],
  ['market/amazon/route', 'GET'],
  ['analytics/route', 'GET'],
  ['top-products/route', 'GET'],
  ['health-score/[productId]/route', 'GET', { productId: UUID }],
  ['track/click/route', 'GET'],
  ['weekly-report/route', 'POST'],
  ['pipeline/run/route', 'POST'],
  ['pipeline/discover/route', 'POST'],
  ['pipeline/discover/route', 'GET'],
  ['auto-optimize/route', 'POST'],
  ['auto-optimize/route', 'GET'],
  ['import/route', 'POST'],
  ['integrations/route', 'GET'],
  ['invoices/route', 'GET'],
  ['invoices/route', 'POST'],
  ['design/[productId]/route', 'GET', { productId: UUID }],
  ['design/[productId]/route', 'POST', { productId: UUID }],
  ['products/route', 'POST'],
  ['products/[id]/route', 'GET', { id: UUID }],
  ['products/[id]/route', 'PUT', { id: UUID }],
  ['products/[id]/route', 'DELETE', { id: UUID }],
  ['products/manual-add/route', 'POST'],
  ['social/publish/route', 'POST'],
  ['nurture/enroll/route', 'GET'],
  ['nurture/enroll/route', 'POST'],
  ['admin/trends/route', 'GET'],
  ['admin/trends/route', 'POST'],
  ['admin/trends/export/route', 'GET'],
  ['blog/route', 'POST'],
  ['categories/route', 'POST'],
  ['generate/route', 'POST'],
  ['ab-test/route', 'POST'],
  ['cron/purge-visits/route', 'POST'],
  ['cron/social-publish/route', 'POST'],
  ['cron/exchange-rates/route', 'POST'],
];

describe('routes d’administration : 401 sans authentification', () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = 'secret-de-test';
    process.env.INTERNAL_API_KEY = 'cle-interne-de-test';
    process.env.CRON_SECRET = 'cron-de-test';
  });
  afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

  for (const [route, method, params] of CASES) {
    it(`${method} /api/${route.replace(/\/route$/, '')}`, async () => {
      const mod = (await import(/* @vite-ignore */ `@/app/api/${route}`)) as Record<string, (...a: unknown[]) => Promise<Response>>;
      const handler = mod[method];
      expect(typeof handler).toBe('function');
      const res = await handler(
        new NextRequest('http://localhost/api/test', { method, headers: { 'content-type': 'application/json' } }),
        { params: params ?? {} },
      );
      expect(res.status).toBe(401);
    });

    it(`${method} /api/${route.replace(/\/route$/, '')} refuse un mauvais jeton`, async () => {
      const mod = (await import(/* @vite-ignore */ `@/app/api/${route}`)) as Record<string, (...a: unknown[]) => Promise<Response>>;
      const res = await mod[method](
        new NextRequest('http://localhost/api/test', { method, headers: { authorization: 'Bearer mauvais', 'content-type': 'application/json' } }),
        { params: params ?? {} },
      );
      expect(res.status).toBe(401);
    });
  }
});
