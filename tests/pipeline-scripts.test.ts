import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (f: string) => readFileSync(join(root, f), 'utf8');

describe('scripts serveur (cron, déploiement, démarrage)', () => {
  it('syntaxe bash valide', () => {
    for (const f of ['pipeline-cron.sh', 'deploy.sh', 'start.sh']) expect(() => execFileSync('bash', ['-n', join(root, f)])).not.toThrow();
  });

  it('deploy.sh : build AVANT le redémarrage, un seul déploiement à la fois, verrou du worker, vérification que le site répond', () => {
    const s = read('deploy.sh');
    expect(s.indexOf('npm run build')).toBeGreaterThan(0);
    expect(s.indexOf('npm run build')).toBeLessThan(s.indexOf('pm2 startOrReload'));
    expect(s).toContain('set -euo pipefail');
    expect(s).toContain('flock -n 8');
    expect(s).toContain('/tmp/opf-trend-worker.lock');
    expect(s).toContain('--ff-only');
    expect(s).toMatch(/ne répond pas/);
    const code = s.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
    expect(code).not.toMatch(/pm2 restart/); // « restart --update-env » ne relit pas ecosystem.config.js (nouvelles variables ignorées)
    // les verrous ne sont pas hérités par pm2 (sinon ils resteraient pris par le démon)
    expect(s).toMatch(/pm2 startOrReload[^\n]*8>&-/);
    expect(s).toContain('flock -u 9');
  });

  it('pipeline-cron.sh : flux des produits (trend-worker) avec verrou partagé, délai maximal et .env.local', () => {
    const s = read('pipeline-cron.sh');
    expect(s).toContain('trend-worker)');
    expect(s).toContain('/tmp/opf-trend-worker.lock');
    expect(s).toMatch(/timeout --kill-after=\d+ \d+/);
    expect(s).toContain('--env-file=.env.local');
    expect(s).toContain('scripts/pipeline/worker.mjs');
    expect(s).toContain('flock -n 9');
    expect(s).toContain('--max-time'); // plus d'appel curl sans délai maximal
    expect(s).not.toMatch(/\bcurl -s -X POST/);
    expect(read('scripts/pipeline/worker.mjs')).toContain('pipeline-cron.sh trend-worker');
  });

  it('pipeline-cron.sh : marché invalide refusé avant tout appel, action inconnue = mode d’emploi', () => {
    const run = (args: string[], env: Record<string, string>) => spawnSync('bash', [join(root, 'pipeline-cron.sh'), ...args], { env: { PATH: process.env.PATH ?? '', HOME: tmpdir(), ...env }, encoding: 'utf8' });
    const bad = run(['run'], { MARKET: 'de; rm -rf /', PIPELINE_SECRET: 'x' });
    expect(bad.status).toBe(1);
    expect(bad.stdout).toContain('MARKET invalide');
    // action inconnue : mode d'emploi, sans traceback Python
    const down = run(['usage-inconnu'], { PIPELINE_SECRET: 'x' });
    expect(down.status).toBe(1);
    expect(down.stdout).toContain('Usage');
    expect(down.stderr).not.toContain('Traceback');
  });

  it('start.sh : refuse de démarrer sans .env.local', () => {
    expect(read('start.sh')).toMatch(/\.env\.local introuvable/);
  });

  it('ecosystem.config.js : se charge, une seule app « opf », seulement les variables autorisées', () => {
    process.env.OPF_TEST_NON_AUTORISEE = 'secret';
    const cfg = require(join(root, 'ecosystem.config.js'));
    expect(cfg.apps[0].name).toBe('opf');
    expect(cfg.apps[0].env.NODE_ENV).toBe('production');
    expect(cfg.apps[0].env.OPF_TEST_NON_AUTORISEE).toBeUndefined();
    expect(cfg.apps[0].autorestart).toBe(true);
    delete process.env.OPF_TEST_NON_AUTORISEE;
  });
});
