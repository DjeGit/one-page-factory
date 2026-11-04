import { describe, it, expect } from 'vitest';
import { startOfTodayIso } from '../lib/analytics/period';
import { createRecentGuard } from '../lib/analytics/dedup';

describe('startOfTodayIso (minuit à Madrid)', () => {
  it('hiver (UTC+1) : minuit local = 23h UTC la veille', () => {
    expect(startOfTodayIso(new Date('2026-01-15T10:30:00Z'), 'Europe/Madrid')).toBe('2026-01-14T23:00:00.000Z');
  });
  it('été (UTC+2) : minuit local = 22h UTC la veille', () => {
    expect(startOfTodayIso(new Date('2026-07-15T10:30:00Z'), 'Europe/Madrid')).toBe('2026-07-14T22:00:00.000Z');
  });
  it('juste après minuit local, on est déjà dans le nouveau jour', () => {
    // 2026-11-03 23:30 UTC = 2026-11-04 00:30 à Madrid
    expect(startOfTodayIso(new Date('2026-11-03T23:30:00Z'), 'Europe/Madrid')).toBe('2026-11-03T23:00:00.000Z');
    // 2026-11-03 22:30 UTC = 2026-11-03 23:30 à Madrid : encore le 3
    expect(startOfTodayIso(new Date('2026-11-03T22:30:00Z'), 'Europe/Madrid')).toBe('2026-11-02T23:00:00.000Z');
  });
  it('jour du changement d\'heure (29/03/2026) : minuit est encore en heure d\'hiver', () => {
    expect(startOfTodayIso(new Date('2026-03-29T12:00:00Z'), 'Europe/Madrid')).toBe('2026-03-28T23:00:00.000Z');
  });
  it('UTC : minuit UTC', () => {
    expect(startOfTodayIso(new Date('2026-11-03T15:00:00Z'), 'UTC')).toBe('2026-11-03T00:00:00.000Z');
  });
});

describe('createRecentGuard', () => {
  it('ignore la répétition dans la fenêtre, laisse passer ensuite', () => {
    const seen = createRecentGuard(10_000);
    expect(seen('a', 0)).toBe(false);
    expect(seen('a', 5_000)).toBe(true);
    expect(seen('b', 5_000)).toBe(false);
    expect(seen('a', 10_001)).toBe(false);
  });
  it('ne grossit pas sans limite', () => {
    const seen = createRecentGuard(10_000, 3);
    for (let i = 0; i < 10; i++) seen(`k${i}`, 0);
    expect(seen('k9', 1)).toBe(true); // la dernière est connue
    expect(seen('k0', 1)).toBe(false); // une ancienne a été oubliée plutôt que de grossir
  });
});
