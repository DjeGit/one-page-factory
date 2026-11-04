import { describe, it, expect } from 'vitest';
import {
  buildTrendViews, refusedList, trendLockState, parseNumber, parseCommission, type TrendCandidate,
} from '@/lib/trends';
import { publicUrl, summarizeSync, toTableProduct } from '@/lib/admin-products-view';
import { normalizeWeeklyReport, isEmptyReport } from '@/components/admin/weekly-report';
import { readABTest, normalCdf } from '@/components/admin/ab-stats';
import { readApiError, networkErrorMessage } from '@/components/admin/http';

const cand = (o: Partial<TrendCandidate>): TrendCandidate => ({
  id: 'x', aliexpress_id: '1005000000001', week: '2026-11-02', category_slug: 'tech', name: 'P', product_type: null, image_url: null,
  price_fr: null, price_es: null, price_uk: null, commission_fr: null, commission_uk: null, rating: null, reviews: null, sales: null,
  seller: null, free_shipping_fr: null, free_shipping_es: null, free_shipping_uk: null, url_fr: null, url_uk: null, note: null,
  decision: 'pending', decided_at: null, status: 'candidate', error: null, ...o,
});

describe('Tendance de la semaine : vues et compteurs', () => {
  const week = [
    cand({ id: 'a', aliexpress_id: '1', decision: 'pending' }),
    cand({ id: 'b', aliexpress_id: '2', decision: 'yes', status: 'validated', category_slug: 'loisirs' }),
    cand({ id: 'c', aliexpress_id: '3', decision: 'no' }),
  ];
  const archive = [
    cand({ id: 'd', aliexpress_id: '3', week: '2026-10-26', decision: 'no' }), // déjà refusé cette semaine : pas de doublon
    cand({ id: 'e', aliexpress_id: '4', week: '2026-10-26', decision: 'no' }),
    cand({ id: 'f', aliexpress_id: '4', week: '2026-10-19', decision: 'no' }), // refusé deux semaines de suite : une seule ligne
  ];

  it('les refusés = semaine + archive, sans doublon', () => {
    expect(refusedList(week, archive).map((c) => c.id)).toEqual(['c', 'e']);
  });
  it('les compteurs correspondent à la liste affichée', () => {
    const v = buildTrendViews(week, archive, 'no');
    expect(v.counts).toEqual({ active: 2, pending: 1, yes: 1, no: 2 });
    expect(v.list).toHaveLength(v.counts.no);
  });
  it('filtres actifs / à choisir / retenus et catégorie', () => {
    expect(buildTrendViews(week, archive, 'active').list.map((c) => c.id)).toEqual(['a', 'b']);
    expect(buildTrendViews(week, archive, 'pending').list.map((c) => c.id)).toEqual(['a']);
    expect(buildTrendViews(week, archive, 'yes').list.map((c) => c.id)).toEqual(['b']);
    expect(buildTrendViews(week, archive, 'active', 'loisirs').list.map((c) => c.id)).toEqual(['b']);
  });
  it('verrouillage de la décision selon l’avancement du traitement automatique', () => {
    expect(trendLockState({ decision: 'pending', status: 'candidate' })).toBe('free');
    expect(trendLockState({ decision: 'yes', status: 'validated' })).toBe('free');
    expect(trendLockState({ decision: 'yes', status: 'error' })).toBe('free');
    expect(trendLockState({ decision: 'yes', status: 'ready' })).toBe('confirm');
    expect(trendLockState({ decision: 'yes', status: 'in_progress' })).toBe('locked');
    expect(trendLockState({ decision: 'yes', status: 'live' })).toBe('locked');
  });
});

describe('lecture des nombres et commissions (formats FR / EN)', () => {
  it('milliers et décimales', () => {
    expect(parseNumber('1.234,56')).toBe(1234.56);
    expect(parseNumber('1,234.56')).toBe(1234.56);
    expect(parseNumber('1 234,5 €')).toBe(1234.5);
    expect(parseNumber('12,5')).toBe(12.5);
    expect(parseNumber('1,234')).toBe(1234);
    expect(parseNumber('')).toBeNull();
  });
  it('« 1 % » vaut 1 %, pas 100 %', () => {
    expect(parseCommission('1 %')).toBe(0.01);
    expect(parseCommission('7 %')).toBe(0.07);
    expect(parseCommission('7')).toBe(0.07);
    expect(parseCommission('0,07')).toBe(0.07);
  });
});

describe('adresses publiques et résumé de synchronisation', () => {
  it('chaque marché pointe vers son domaine public', () => {
    expect(publicUrl('fr', '/mon-produit')).toBe('https://tendpick.fr/mon-produit');
    expect(publicUrl('es', 'mon-produit')).toBe('https://tendpick.es/mon-produit');
    expect(publicUrl('uk', '/')).toBe('https://tendpick.com');
    expect(publicUrl(undefined, '/x')).toBe('https://tendpick.fr/x');
  });
  it('résumé : marchés suivis et marchés restés en brouillon', () => {
    expect(summarizeSync(null, true)).toEqual({ text: '', blocked: false });
    const r = summarizeSync(
      { activated: [{ market: 'es' }], deactivated: [], skipped: [{ market: 'uk', reasons: ['aucune photo'] }] },
      true,
    );
    expect(r.blocked).toBe(true);
    expect(r.text).toContain('Activé aussi sur : ES');
    expect(r.text).toContain('UK resté en brouillon (aucune photo)');
    expect(summarizeSync({ deactivated: [{ market: 'fr' }] }, false)).toEqual({ text: 'Désactivé aussi sur : FR.', blocked: false });
  });
  it('allégement des lignes de la liste produits', () => {
    const row = toTableProduct({ id: '1', name: 'N', slug: 's', active: true, market: 'es', images: ['', 'a.jpg', 'b.jpg'], image_url: 'c.jpg', faq: [{}] } as never);
    expect(row).toEqual({
      id: '1', name: 'N', slug: 's', active: true, market: 'es', category_id: null, source_product_ref: null,
      price: null, price_currency: null, image_url: 'c.jpg', images: ['a.jpg'],
    });
    expect(row).not.toHaveProperty('faq');
  });
});

describe('rapport hebdomadaire du tableau de bord', () => {
  it('accepte la réponse réelle de l’API (clés anglaises dans « report »)', () => {
    const r = normalizeWeeklyReport({
      report: { summary: 'Bonne semaine', top_products: ['A', 'B'], to_archive: [], recommendations: ['Pousser A'], insight: 'Le mobile domine' },
      stats: [],
    });
    expect(r).toMatchObject({ resume: 'Bonne semaine', top_produits: ['A', 'B'], recommandations: ['Pousser A'], insight_cle: 'Le mobile domine' });
    expect(r.a_archiver).toBeUndefined();
    expect(isEmptyReport(r)).toBe(false);
  });
  it('accepte aussi les clés françaises et détecte un rapport vide', () => {
    expect(normalizeWeeklyReport({ resume: 'ok' }).resume).toBe('ok');
    expect(isEmptyReport(normalizeWeeklyReport({ report: {} }))).toBe(true);
    expect(isEmptyReport(normalizeWeeklyReport(null))).toBe(true);
  });
});

describe('A/B testing : lecture statistique', () => {
  it('la loi normale est correcte', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 3);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 2);
  });
  it('pas assez de données : jamais de gagnant', () => {
    const r = readABTest({ views: 50, clicks: 20 }, { views: 40, clicks: 1 });
    expect(r.enoughData).toBe(false);
    expect(r.significant).toBe(false);
  });
  it('écart réel mais faible taux de clic : détecté (l’ancien seuil de 20 points ne le voyait jamais)', () => {
    const r = readABTest({ views: 2000, clicks: 100 }, { views: 2000, clicks: 160 }); // 5 % contre 8 %
    expect(r.leader).toBe('b');
    expect(r.significant).toBe(true);
    expect(r.confidence).toBeGreaterThan(99);
  });
  it('écart dû au hasard : non significatif', () => {
    const r = readABTest({ views: 300, clicks: 15 }, { views: 300, clicks: 18 });
    expect(r.enoughData).toBe(true);
    expect(r.significant).toBe(false);
  });
  it('données incohérentes ou vides sans plantage', () => {
    expect(readABTest({ views: 0, clicks: 0 }, { views: 0, clicks: 0 })).toMatchObject({ confidence: 0, significant: false, leader: null });
    expect(readABTest({ views: 100, clicks: 500 }, { views: 100, clicks: 0 }).ctrA).toBe(100); // clics plafonnés aux vues
  });
});

describe('messages d’erreur des appels API', () => {
  it('lit le message JSON du serveur', async () => {
    expect(await readApiError(new Response(JSON.stringify({ error: 'Slug déjà utilisé' }), { status: 400 }))).toBe('Slug déjà utilisé');
  });
  it('page HTML d’un proxy : message clair, jamais « Unexpected token < »', async () => {
    const msg = await readApiError(new Response('<html>Bad gateway</html>', { status: 502 }));
    expect(msg).toContain('ne répond pas');
    expect(msg).not.toContain('Unexpected');
  });
  it('session expirée', async () => {
    expect(await readApiError(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))).toContain('Session expirée');
  });
  it('erreur sans détail : le code HTTP est indiqué', async () => {
    expect(await readApiError(new Response('', { status: 500 }), 'Sauvegarde impossible')).toBe('Sauvegarde impossible (erreur 500)');
  });
  it('coupure réseau', () => {
    expect(networkErrorMessage(new TypeError('Failed to fetch'))).toContain('connexion');
    expect(networkErrorMessage(new Error('Slug déjà utilisé'))).toBe('Slug déjà utilisé');
  });
});
