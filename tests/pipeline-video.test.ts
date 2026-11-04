import { describe, it, expect } from 'vitest';
// @ts-ignore — module Node pur (.mjs)
import { tokens, modelTokens, parseDuration, scoreTitle, findVideo } from '../scripts/pipeline/video.mjs';

describe('video (YouTube)', () => {
  it('tokens / modelTokens : repères de modèle, pas de mots génériques', () => {
    expect(tokens('Garmin Forerunner 165 montre GPS de running')).toEqual(['garmin', 'forerunner', '165', 'montre', 'gps', 'running']);
    expect(modelTokens('Garmin Forerunner 165 montre GPS')).toEqual(['165']);
    expect(modelTokens('AMD Ryzen 7 7800X3D')).toEqual(['7800x3d']);
    expect(modelTokens('Pistolet de massage électrique 30 niveaux')).toEqual([]);
  });

  it('parseDuration', () => {
    expect(parseDuration('PT12M30S')).toBe(750);
    expect(parseDuration('PT1H2M')).toBe(3720);
    expect(parseDuration('PT45S')).toBe(45);
    expect(parseDuration('nimportequoi')).toBe(0);
  });

  it('scoreTitle : exige le modèle et une bonne part des mots', () => {
    expect(scoreTitle('Garmin Forerunner 165 montre GPS', 'Test Garmin Forerunner 165 : la montre GPS idéale ?')).toBeGreaterThan(0.5);
    expect(scoreTitle('Garmin Forerunner 165 montre GPS', 'Garmin Forerunner 265 test complet')).toBeNull(); // autre modèle
    expect(scoreTitle('Garmin Forerunner 165 montre GPS', 'Meilleures montres GPS 2026')).toBeNull();
    expect(scoreTitle('Pistolet de massage électrique 30 niveaux', 'Pistolet de massage test')).toBeNull(); // pas de repère de modèle
    expect(scoreTitle('AMD Ryzen 7 7800X3D', 'Ryzen 7 7800 X3D review')).toBeGreaterThan(0); // espaces dans le titre
  });

  const json = (body: any) => new Response(JSON.stringify(body), { status: 200 });
  const mkFetch = (searchIds: string[], videos: any[], log: string[] = []) => (async (u: any) => {
    const url = String(u);
    log.push(url);
    if (url.includes('/search?')) return json({ items: searchIds.map((id) => ({ id: { videoId: id } })) });
    return json({ items: videos });
  }) as any;
  const vid = (id: string, title: string, over: any = {}) => ({ id, snippet: { title, channelTitle: 'Chaîne' }, contentDetails: { duration: 'PT10M' }, status: { embeddable: true, privacyStatus: 'public' }, statistics: { viewCount: '5000' }, ...over });

  it('findVideo : garde la meilleure vidéo publique, intégrable, de durée correcte et au bon modèle', async () => {
    const log: string[] = [];
    const fetchImpl = mkFetch(['a', 'b', 'c', 'd', 'e'], [
      vid('a', 'Garmin Forerunner 265 test'), // autre modèle
      vid('b', 'Test Garmin Forerunner 165 GPS montre', { status: { embeddable: false, privacyStatus: 'public' } }), // non intégrable
      vid('c', 'Test Garmin Forerunner 165 GPS montre', { contentDetails: { duration: 'PT20S' } }), // trop courte
      vid('d', 'Test Garmin Forerunner 165 : montre GPS', { statistics: { viewCount: '1000' } }),
      vid('e', 'Garmin Forerunner 165 montre GPS avis complet', { statistics: { viewCount: '900000' } }),
    ], log);
    const r = await findVideo({ name: 'Garmin Forerunner 165 montre GPS', market: 'fr' }, { apiKey: 'K', fetchImpl });
    expect(r?.url).toBe('https://www.youtube.com/watch?v=e');
    expect(log[0]).toContain('relevanceLanguage=fr');
    expect(log[0]).toContain('videoEmbeddable=true');
  });

  it('findVideo : rien de fiable → null ; produit sans repère → aucune requête ; sans clé → erreur', async () => {
    const log: string[] = [];
    expect(await findVideo({ name: 'Garmin Forerunner 165 montre GPS', market: 'es' }, { apiKey: 'K', fetchImpl: mkFetch(['a'], [vid('a', 'Resumen de la semana')], log) })).toBeNull();
    const none: string[] = [];
    expect(await findVideo({ name: 'Pistolet de massage 30 niveaux', market: 'fr' }, { apiKey: 'K', fetchImpl: mkFetch([], [], none) })).toBeNull();
    expect(none.length).toBe(0);
    await expect(findVideo({ name: 'Garmin Forerunner 165', market: 'fr' }, {})).rejects.toThrow('YOUTUBE_API_KEY');
    await expect(findVideo({ name: 'Garmin Forerunner 165', market: 'fr' }, { apiKey: 'SECRET', fetchImpl: (async () => new Response('x', { status: 403 })) as any })).rejects.toThrow(/^YouTube 403$/);
  });

  it('findVideo : chaque appel à YouTube a un délai maximal (un service muet ne bloque pas le flux)', async () => {
    const inits: any[] = [];
    const fetchImpl = (async (_u: string, init: any) => { inits.push(init); return new Response(JSON.stringify({ items: [] }), { status: 200 }); }) as any;
    await findVideo({ name: 'Garmin Forerunner 165 montre GPS', market: 'fr' }, { apiKey: 'K', fetchImpl });
    expect(inits.length).toBeGreaterThan(0);
    expect(inits.every((i) => i?.signal instanceof AbortSignal)).toBe(true);
  });
});
