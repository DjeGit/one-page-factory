import { describe, it, expect } from 'vitest';
import { classifyPath, clampSeconds, isUuid, referrerHost } from '@/lib/visitor-tracking';
import { computeVisitorStats } from '@/lib/visitor-stats';

describe('classifyPath', () => {
  it('classe les pages publiques et retire query et ancre', () => {
    expect(classifyPath('/')?.type).toBe('home');
    expect(classifyPath('/blog/mon-article?x=1#a')).toEqual({ path: '/blog/mon-article', type: 'blog_post' });
    expect(classifyPath('/guide-achat/')?.type).toBe('guide');
    expect(classifyPath('/c/tecnologia')?.type).toBe('category');
    expect(classifyPath('/casque-test')?.type).toBe('product');
    expect(classifyPath('/a-propos')?.type).toBe('info');
  });

  it('exclut le back-office, les API et les chemins invalides', () => {
    expect(classifyPath('/admin/products')).toBeNull();
    expect(classifyPath('/api/visit')).toBeNull();
    expect(classifyPath('/bio')).toBeNull();
    expect(classifyPath('http://x')).toBeNull();
    expect(classifyPath('/a b')).toBeNull();
    expect(classifyPath(42)).toBeNull();
  });
});

describe('referrerHost / clampSeconds / isUuid', () => {
  it('garde le domaine externe, ignore les liens internes', () => {
    expect(referrerHost('https://www.google.com/search?q=x')).toBe('google.com');
    expect(referrerHost('https://tendpick.fr/blog')).toBeNull();
    expect(referrerHost('')).toBeNull();
  });

  it('borne la durée à 30 minutes', () => {
    expect(clampSeconds(99999)).toBe(1800);
    expect(clampSeconds(-5)).toBe(0);
    expect(clampSeconds('3')).toBeNull();
  });

  it('valide les UUID', () => {
    expect(isUuid('3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90')).toBe(true);
    expect(isUuid('abc')).toBe(false);
  });
});

describe('computeVisitorStats', () => {
  const rows = [
    { visitor_id: 'a', session_id: 's1', path: '/', page_type: 'home', referrer_host: 'google.com', duration_seconds: 30 },
    { visitor_id: 'a', session_id: 's1', path: '/blog', page_type: 'blog', referrer_host: null, duration_seconds: 90 },
    { visitor_id: 'b', session_id: 's2', path: '/', page_type: 'home', referrer_host: null, duration_seconds: null },
    { visitor_id: 'c', session_id: 's3', path: '/', page_type: 'home', referrer_host: 'google.com', duration_seconds: 60 },
  ];
  const visitors = [
    { visitor_id: 'a', visit_count: 3 },
    { visitor_id: 'b', visit_count: 1 },
    { visitor_id: 'c', visit_count: 1 },
  ];

  it('compte visiteurs, visites, pages et retour', () => {
    const s = computeVisitorStats(rows, visitors);
    expect([s.visitors, s.sessions, s.pageViews]).toEqual([3, 3, 4]);
    expect([s.newVisitors, s.returningVisitors]).toEqual([2, 1]);
    expect(Math.round(s.returningRate * 100)).toBe(33);
    expect(s.frequency.map((f) => f.count)).toEqual([2, 0, 1, 0]);
  });

  it('calcule les temps moyens sur les durées connues seulement', () => {
    const s = computeVisitorStats(rows, visitors);
    expect(Math.round(s.avgPageSeconds)).toBe(60);
    expect(Math.round(s.avgSessionSeconds)).toBe(90);
    expect(s.topPages[0]).toEqual({ path: '/', views: 3, avgSeconds: 45 });
    expect(s.referrers[0]).toEqual({ host: 'google.com', sessions: 2 });
  });

  it('ne plante pas sans donnée', () => {
    const s = computeVisitorStats([], []);
    expect(s.visitors).toBe(0);
    expect(s.returningRate).toBe(0);
    expect(s.pagesPerSession).toBe(0);
  });
});
