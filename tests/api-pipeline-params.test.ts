import { describe, it, expect } from 'vitest';
import { parseOptimizeParams } from '@/app/api/_lib/auto-optimize';
import { parseDiscoverParams } from '@/app/api/_lib/pipeline-discover';

describe('parseOptimizeParams', () => {
  it('valeurs par défaut', () => {
    const r = parseOptimizeParams({});
    expect(r).toEqual({ params: { dryRun: false, minViews: 500, pauseThreshold: 0.5, scaleThreshold: 5, market: undefined } });
  });
  it('refuse les types faux et les marchés inconnus', () => {
    expect('error' in parseOptimizeParams({ dry_run: 'oui' })).toBe(true);
    expect('error' in parseOptimizeParams({ min_views: 0 })).toBe(true);
    expect('error' in parseOptimizeParams({ pause_threshold: '0.5' })).toBe(true);
    expect('error' in parseOptimizeParams({ pause_threshold: 150 })).toBe(true);
    expect('error' in parseOptimizeParams({ market: 'com' })).toBe(true);
    expect('params' in parseOptimizeParams({ market: 'uk', min_views: 100 })).toBe(true);
  });
});

describe('parseDiscoverParams', () => {
  it('valeurs par défaut : marché fr, seuil 60, 5 imports', () => {
    const r = parseDiscoverParams({});
    expect(r).toEqual({ params: { market: 'fr', threshold: 60, dryRun: false, maxImport: 5 } });
  });
  it('refuse marché inconnu, seuil hors bornes, import massif', () => {
    expect('error' in parseDiscoverParams({ market: 'de' })).toBe(true);
    expect('error' in parseDiscoverParams({ threshold: 101 })).toBe(true);
    expect('error' in parseDiscoverParams({ threshold: 'haut' })).toBe(true);
    expect('error' in parseDiscoverParams({ max_import: 10_000 })).toBe(true);
    expect('error' in parseDiscoverParams({ max_import: 2.5 })).toBe(true);
    expect('error' in parseDiscoverParams({ dry_run: 1 })).toBe(true);
    expect('params' in parseDiscoverParams({ market: 'es', threshold: 70, max_import: 3, dry_run: true })).toBe(true);
  });
});
