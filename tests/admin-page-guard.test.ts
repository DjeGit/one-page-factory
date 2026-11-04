import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

// cookies() de Next n'existe que dans une requête : on le simule.
const cookieJar: { value?: string } = {};
vi.mock('next/headers', () => ({
  cookies: () => ({ get: (name: string) => (name === 'admin_auth' && cookieJar.value ? { value: cookieJar.value } : undefined) }),
}));

import { withAdminAuth, isAdminAuthenticated } from '@/app/admin/admin-guard';
import { hashAdminToken } from '@/lib/admin-auth';

function allPages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return allPages(full);
    return name === 'page.tsx' ? [full] : [];
  });
}

describe('garde d’authentification des pages admin', () => {
  beforeEach(() => {
    cookieJar.value = undefined;
  });

  it('chaque page de app/admin est exportée via withAdminAuth (sinon elle interroge la base même déconnecté)', () => {
    const root = path.resolve(__dirname, '../app/admin');
    const pages = allPages(root);
    expect(pages.length).toBeGreaterThan(10);
    const unguarded = pages.filter((f) => !/export default withAdminAuth\(/.test(readFileSync(f, 'utf8')));
    expect(unguarded.map((f) => path.relative(root, f))).toEqual([]);
  });

  it('non connecté : la page ne s’exécute pas', async () => {
    const page = vi.fn(async () => 'contenu');
    const guarded = withAdminAuth(page);
    expect(await guarded({})).toBeNull();
    expect(page).not.toHaveBeenCalled();
    expect(isAdminAuthenticated()).toBe(false);
  });

  it('cookie invalide : refusé', async () => {
    cookieJar.value = 'n-importe-quoi';
    const page = vi.fn(async () => 'contenu');
    expect(await withAdminAuth(page)({})).toBeNull();
    expect(page).not.toHaveBeenCalled();
  });

  it('cookie valide : la page s’exécute avec ses paramètres', async () => {
    vi.stubEnv('ADMIN_SECRET', 'secret-de-test');
    cookieJar.value = hashAdminToken('secret-de-test');
    const page = vi.fn(async (props: { id: string }) => `fiche ${props.id}`);
    expect(await withAdminAuth(page)({ id: '42' })).toBe('fiche 42');
    expect(page).toHaveBeenCalledOnce();
    vi.unstubAllEnvs();
  });
});
