import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
// @ts-ignore — module Node pur (.mjs) sans déclaration de types
import { normalizeImageUrl, dedupe, toSquareJpeg, pickBest, parseClassification, processProduct, visionProvider, classifyImages, parseBox, cropToCleanBox, isPublicUrl, MIN_PHOTOS as PHOTOS_MIN } from '../scripts/photos/pipeline.mjs';
// @ts-ignore
import { MIN_PHOTOS as GATES_MIN } from '../scripts/pipeline/gates.mjs';

const solid = (w: number, h: number, rgb: [number, number, number]) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } }).jpeg().toBuffer();

// Image synthétique : fond blanc + rectangle de couleur (mime un produit détouré) ou dégradé (mime une scène).
async function product(w: number, h: number, seed: number) {
  const rect = await sharp({ create: { width: Math.round(w / 3), height: Math.round(h / 3), channels: 3, background: { r: 30 + seed * 40, g: 60, b: 200 - seed * 30 } } }).png().toBuffer();
  return sharp({ create: { width: w, height: h, channels: 3, background: '#ffffff' } })
    .composite([{ input: rect, left: Math.round(w / 3) + seed * 10, top: Math.round(h / 3) }])
    .jpeg().toBuffer();
}
async function scene(w: number, h: number, k = 0) {
  const px = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 3; const v = k === 0 ? (x * 255) / w : (Math.floor((x * (k + 1) * 3) / w + Math.floor((y * (k + 2)) / h)) % 2) * 255; px[i] = v; px[i + 1] = (y * 255) / h; px[i + 2] = 90; }
  return sharp(px, { raw: { width: w, height: h, channels: 3 } }).jpeg().toBuffer();
}

describe('photos pipeline', () => {
  it('normalizeImageUrl retire les suffixes de miniature', () => {
    expect(normalizeImageUrl('//ae01.alicdn.com/kf/Sabc.jpg_640x640q80.jpg_.webp')).toBe('https://ae01.alicdn.com/kf/Sabc.jpg');
    expect(normalizeImageUrl('https://ae-pic-a1.aliexpress-media.com/kf/Sabc.png?x=1')).toBe('https://ae-pic-a1.aliexpress-media.com/kf/Sabc.png');
    expect(normalizeImageUrl('pas une url')).toBeNull();
  });

  it('toSquareJpeg : toujours 1000x1000 JPEG, fond blanc conservé sans couper', async () => {
    for (const [w, h] of [[1200, 800], [800, 1200], [900, 900], [3000, 600]] as const) {
      const out = await toSquareJpeg(await product(w, h, 1));
      const m = await sharp(out.buffer).metadata();
      expect([m.width, m.height, m.format]).toEqual([1000, 1000, 'jpeg']);
    }
    expect((await toSquareJpeg(await product(1200, 800, 1))).mode).toBe('contain-white');
    expect((await toSquareJpeg(await scene(1200, 800))).mode).toBe('cover-attention');
    expect((await toSquareJpeg(await product(900, 920, 1))).mode).toBe('cover');
  });

  it('dedupe écarte les doublons visuels', async () => {
    const a = await scene(800, 800);
    const aSmall = await sharp(a).resize(500, 500).jpeg({ quality: 60 }).toBuffer();
    const b = await product(800, 800, 2);
    const kept = await dedupe([{ buf: a }, { buf: aSmall }, { buf: b }]);
    expect(kept.length).toBe(2);
  });

  it('pickBest : couverture = produit sur fond blanc, écarte promo/texte lourd, variété', () => {
    const v = (index: number, kind: string, score: number, text = 'none', usable = true) => ({ index, kind, score, text, usable, watermark: false });
    const picked = pickBest([
      v(0, 'product_in_use', 5), v(1, 'promo', 5, 'heavy', false), v(2, 'product_white', 4), v(3, 'detail', 3),
      v(4, 'detail', 4), v(5, 'detail', 5), v(6, 'infographic', 5, 'heavy', false), v(7, 'product_in_use', 3),
    ]);
    expect(picked[0].index).toBe(2);
    expect(picked.length).toBe(5);
    expect(picked.some((p: any) => p.kind === 'promo' || p.kind === 'infographic')).toBe(false);
    expect(picked.filter((p: any) => p.kind === 'detail').length).toBeLessThanOrEqual(2);
  });

  it('pickBest : les photos à gros texte ne servent qu’en dernier recours, pour atteindre le minimum', () => {
    const v = (index: number, kind: string, extra: any = {}) => ({ index, usable: true, kind, shot: `s${index}`, text: 'none', score: 3, ...extra });
    const picked = pickBest([v(0, 'product_white', { score: 5 }), v(1, 'infographic', { text: 'heavy', score: 4 }), v(2, 'product_in_use', { text: 'heavy', score: 5 })]);
    expect(picked.map((p: any) => p.index).sort()).toEqual([0, 1, 2]);
    // assez de photos propres : les photos à texte restent écartées
    const enough = pickBest([v(0, 'product_white'), v(1, 'detail'), v(2, 'product_in_use'), v(3, 'infographic', { text: 'heavy', score: 5 })]);
    expect(enough.map((p: any) => p.index).sort()).toEqual([0, 1, 2]);
    // jamais de promo, d'emballage ni de tableau de tailles, même en dernier recours
    const none = pickBest([v(0, 'product_white'), v(1, 'promo', { text: 'heavy' }), v(2, 'size_chart', { text: 'heavy' })]);
    expect(none.length).toBe(1);
  });

  it('pickBest : jamais deux fois la même prise de vue, photos propres avant les photos à texte ou recadrées', () => {
    const v = (index: number, kind: string, shot: string, score = 4, extra: any = {}) => ({ index, kind, shot, score, text: 'none', usable: true, watermark: false, ...extra });
    const picked = pickBest([
      v(0, 'product_white', 'front view', 5), v(1, 'product_white', 'front view', 5), v(2, 'product_white', 'front view', 4),
      v(3, 'product_white', 'side view', 4), v(4, 'product_in_use', 'worn on wrist', 4), v(5, 'detail', 'close-up port', 3),
      v(6, 'product_white', 'back view', 5, { text: 'light' }), v(7, 'detail', 'close-up screen', 5, { cropped: true }),
    ]);
    const shots = picked.map((p: any) => `${p.kind}|${p.shot}`);
    expect(new Set(shots).size).toBe(shots.length);
    expect(picked.length).toBe(4); // 4 photos propres et distinctes : on ne complète pas avec du texte ou du recadré
    expect(picked.map((p: any) => p.index).sort()).toEqual([0, 3, 4, 5]);
  });

  it('pickBest : texte léger puis recadrées seulement pour atteindre 3 photos, et tolère une prise de vue répétée en dernier recours', () => {
    const v = (index: number, shot: string, extra: any = {}) => ({ index, kind: 'product_white', shot, score: 4, text: 'none', usable: true, watermark: false, ...extra });
    const a = pickBest([v(0, 'front'), v(1, 'back', { text: 'light' }), v(2, 'side', { cropped: true }), v(3, 'top', { cropped: true })]);
    expect(a.map((p: any) => p.index)).toEqual([0, 1, 2]);
    const b = pickBest([v(0, 'front'), v(1, 'front'), v(2, 'front')]);
    expect(b.length).toBe(3);
    // sans libellé de prise de vue (ancienne réponse) : comportement inchangé
    expect(pickBest([v(0, ''), v(1, ''), v(2, '')]).length).toBe(3);
  });

  it('parseClassification lit la prise de vue (shot)', () => {
    const r = parseClassification('[{"index":0,"usable":true,"kind":"detail","text":"none","score":3,"shot":" Front View "}]', 1);
    expect(r[0].shot).toBe('front view');
  });

  it('parseClassification tolère le texte autour et complète les index manquants', () => {
    const r = parseClassification('Voici :\n[{"index":0,"usable":true,"kind":"product_white","text":"none","score":9}]', 2);
    expect(r[0].score).toBe(5);
    expect(r[1].usable).toBe(false);
    expect(r[1].text).toBe('heavy');
    expect(() => parseClassification('rien', 1)).toThrow();
    // numérotation à partir de 1 : repli sur l'ordre du tableau ; booléens en texte acceptés
    const r1 = parseClassification('[{"index":1,"usable":"true","kind":"detail","text":"none","score":3},{"index":2,"usable":true,"kind":"product_white","text":"light","score":4}]', 2);
    expect(r1.map((x: any) => x.kind)).toEqual(['detail', 'product_white']);
    expect(r1[0].usable).toBe(true);
  });

  it('processProduct (dry-run, classification simulée) : 5 photos carrées, rejette les images écartées', async () => {
    const origFetch = globalThis.fetch;
    const imgs: Record<string, Buffer> = {};
    for (let i = 0; i < 7; i++) imgs[`https://ae01.alicdn.com/kf/S${i}.jpg`] = i % 2 ? await scene(900 + i * 20, 700 + i * 30, i) : await sharp(await product(800 + i * 40, 800, i)).rotate(i * 90).modulate({ hue: i * 50 }).composite([{ input: await scene(300, 300, i + 1), left: i * 30, top: i * 20 }]).jpeg().toBuffer();
    imgs['https://ae01.alicdn.com/kf/S7.jpg'] = await scene(300, 300, 3); // trop petite
    globalThis.fetch = (async (u: any) => {
      const b = imgs[String(u)];
      return b ? new Response(b, { status: 200 }) : new Response('no', { status: 404 });
    }) as any;
    try {
      const classify = async (bufs: Buffer[]) => bufs.map((_, index) => ({ index, usable: index !== 1, kind: index === 1 ? 'promo' : index % 2 ? 'product_in_use' : 'product_white', text: 'none', watermark: false, score: 3 + (index % 3), note: '' }));
      const row = { aliexpress_id: '1', image_urls: Object.keys(imgs).map((u) => u + '_640x640.jpg_.webp') };
      const out = await processProduct(row, { dryRun: true, classify });
      expect(out.photos.length).toBe(5);
      expect(out.report.tooSmall).toBe(1);
      expect(out.report.rejected.length).toBe(1);
      expect(out.photos[0].kind).toBe('product_white');
      for (const p of out.previews) expect((await sharp(p.buffer).metadata()).width).toBe(1000);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('processProduct : une zone recadrée qui reproduit une autre photo est écartée (pas deux photos identiques)', async () => {
    const origFetch = globalThis.fetch;
    const imgs: Record<string, Buffer> = {};
    const base = await scene(1000, 1000, 1);
    for (let i = 0; i < 4; i++) imgs[`https://ae01.alicdn.com/kf/D${i}.jpg`] = i === 0 ? base : await scene(1000 + i * 10, 900 + i * 15, i + 5);
    // image à gros texte : la même photo + un bandeau de texte en dessous ; sa zone propre = la photo n° 0
    imgs['https://ae01.alicdn.com/kf/D4.jpg'] = await sharp(base).extend({ bottom: 400, background: '#ffffff' }).jpeg().toBuffer();
    globalThis.fetch = (async (u: any) => (imgs[String(u)] ? new Response(imgs[String(u)], { status: 200 }) : new Response('no', { status: 404 }))) as any;
    try {
      const classify = async (bufs: Buffer[]) => bufs.map((_, index) => {
        const heavy = index === bufs.length - 1;
        return { index, usable: true, kind: heavy ? 'infographic' : 'product_white', shot: heavy ? 'front view' : `view ${index}`, text: heavy ? 'heavy' : 'none', watermark: false, score: heavy ? 5 : 4, note: '', cleanBox: heavy ? [0, 0, 714, 1000] : null };
      });
      const out = await processProduct({ aliexpress_id: '3', image_urls: Object.keys(imgs) }, { dryRun: true, classify });
      expect(out.report.cropped).toBe(1);
      expect(out.photos.length).toBe(4); // 5 images, 1 doublon écarté
      expect(out.photos.some((p: any) => p.flags.includes('recadree_sans_texte'))).toBe(false); // on garde l'original non recadré
      expect(out.report.rejected.some((r: any) => r.note === 'doublon visuel')).toBe(true);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('visionProvider : Claude si clé Anthropic non vide, sinon Gemini', () => {
    expect(visionProvider({ ANTHROPIC_API_KEY: '', GEMINI_API_KEY: 'g' })).toBe('gemini');
    expect(visionProvider({ ANTHROPIC_API_KEY: 'a', GEMINI_API_KEY: 'g' })).toBe('claude');
    expect(visionProvider({ ANTHROPIC_API_KEY: 'a', GEMINI_API_KEY: 'g', PHOTO_VISION_PROVIDER: 'gemini' })).toBe('gemini');
    expect(visionProvider({})).toBeNull();
  });

  it('classifyImages (Gemini) envoie les images et lit la réponse JSON', async () => {
    const origFetch = globalThis.fetch;
    let sent: any = null;
    let url = '';
    globalThis.fetch = (async (u: any, init: any) => {
      url = String(u);
      sent = JSON.parse(init.body);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '[{"index":0,"usable":true,"kind":"product_white","text":"none","watermark":false,"score":5,"note":"ok"},{"index":1,"usable":false,"kind":"promo","text":"heavy","watermark":false,"score":1,"note":"11.11"}]' }] } }] }), { status: 200 });
    }) as any;
    try {
      const out = await classifyImages([await scene(700, 700, 1), await scene(700, 700, 2)], { provider: 'gemini', apiKey: 'test' });
      expect(url).toContain('gemini-2.5-flash:generateContent');
      expect(sent.contents[0].parts.filter((p: any) => p.inline_data).length).toBe(2);
      expect(out[0].kind).toBe('product_white');
      expect(out[1].usable).toBe(false);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('classifyImages (Gemini) : réessaie après une surcharge 503, puis abandonne après 3 essais', async () => {
    const origFetch = globalThis.fetch;
    let calls = 0;
    const ok = '[{"index":0,"usable":true,"kind":"product_white","text":"none","watermark":false,"score":5,"note":"ok"}]';
    globalThis.fetch = (async () => {
      calls++;
      return calls < 3
        ? new Response(JSON.stringify({ error: { message: 'high demand' } }), { status: 503 })
        : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: ok }] } }] }), { status: 200 });
    }) as any;
    const waits: number[] = [];
    try {
      const out = await classifyImages([await scene(700, 700, 1)], { provider: 'gemini', apiKey: 'test', sleep: async (ms: number) => { waits.push(ms); } });
      expect(calls).toBe(3);
      expect(waits).toEqual([4000, 10000]);
      expect(out[0].kind).toBe('product_white');
      calls = -100; // toujours 503
      await expect(classifyImages([await scene(700, 700, 1)], { provider: 'gemini', apiKey: 'test', sleep: async () => {} })).rejects.toThrow('Gemini 503');
      expect(calls).toBe(-96); // 1 essai + 3 reprises
      // une erreur définitive (400) n'est pas rejouée
      calls = 0;
      globalThis.fetch = (async () => { calls++; return new Response(JSON.stringify({ error: { message: 'bad' } }), { status: 400 }); }) as any;
      await expect(classifyImages([await scene(700, 700, 1)], { provider: 'gemini', apiKey: 'test', sleep: async () => {} })).rejects.toThrow('Gemini 400');
      expect(calls).toBe(1);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('parseBox / cropToCleanBox : découpe la zone sans texte, refuse les zones trop petites', async () => {
    expect(parseBox([0, 0, 500, 500])).toEqual([0, 0, 500, 500]);
    expect(parseBox([500, 0, 100, 500])).toBeNull();
    expect(parseBox('x')).toBeNull();
    const img = await scene(1200, 1000, 1);
    const out = await cropToCleanBox(img, [0, 0, 1000, 500]); // moitié gauche
    const m = await sharp(out!).metadata();
    expect([m.width, m.height]).toEqual([600, 1000]);
    expect(await cropToCleanBox(img, [0, 0, 300, 300])).toBeNull(); // trop petite
    expect(await cropToCleanBox(img, null)).toBeNull();
  });

  it('processProduct : une image « texte lourd » est recadrée sur sa zone propre et devient exploitable', async () => {
    const origFetch = globalThis.fetch;
    const imgs: Record<string, Buffer> = {};
    for (let i = 0; i < 4; i++) imgs[`https://ae01.alicdn.com/kf/T${i}.jpg`] = await scene(1000 + i * 10, 900 + i * 15, i + 1);
    globalThis.fetch = (async (u: any) => (imgs[String(u)] ? new Response(imgs[String(u)], { status: 200 }) : new Response('no', { status: 404 }))) as any;
    try {
      const classify = async (bufs: Buffer[]) => bufs.map((_, index) => ({ index, usable: true, kind: 'infographic', text: 'heavy', watermark: false, score: 4, note: '', cleanBox: [0, 0, 1000, 600] }));
      const out = await processProduct({ aliexpress_id: '2', image_urls: Object.keys(imgs) }, { dryRun: true, classify });
      expect(out.report.cropped).toBe(4);
      // les zones recadrées (qui paraissent « coupées ») ne servent qu'à atteindre le minimum de 3 photos
      expect(out.photos.length).toBe(3);
      expect(out.photos.every((p: any) => p.flags.includes('recadree_sans_texte') && p.kind === 'detail')).toBe(true);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe('photos pipeline : photos insuffisantes', () => {
  it('processProduct : sous le minimum, l’erreur transporte les bonnes photos déjà retenues', async () => {
    const origFetch = globalThis.fetch;
    const imgs: Record<string, Buffer> = {};
    for (let i = 0; i < 4; i++) imgs[`https://ae01.alicdn.com/kf/P${i}.jpg`] = await scene(1000 + i * 10, 900 + i * 15, i + 1);
    globalThis.fetch = (async (u: any) => (imgs[String(u)] ? new Response(imgs[String(u)], { status: 200 }) : new Response('no', { status: 404 }))) as any;
    try {
      // 2 photos propres, 2 affiches promo (jamais gardées, même en dernier recours)
      const classify = async (bufs: Buffer[]) => bufs.map((_, index) => (index < 2
        ? { index, usable: true, kind: 'product_white', text: 'none', watermark: false, score: 8 - index, note: '' }
        : { index, usable: true, kind: 'promo', text: 'heavy', watermark: false, score: 3, note: '', cleanBox: null }));
      const err: any = await processProduct({ aliexpress_id: '3', image_urls: Object.keys(imgs) }, { dryRun: true, classify }).catch((e: any) => e);
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('seulement 2 photo(s)');
      expect(err.message.length).toBeLessThan(200); // message lisible : le détail va à part
      expect(err.detail).toContain('promo');
      expect(err.partial.photos).toHaveLength(2);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe('photos pipeline : dernier recours avec texte', () => {
  it('processProduct : 2 photos propres + 1 photo à gros texte sans zone propre = 3 photos, la dernière marquée texte_lourd', async () => {
    const origFetch = globalThis.fetch;
    const imgs: Record<string, Buffer> = {};
    for (let i = 0; i < 3; i++) imgs[`https://ae01.alicdn.com/kf/Q${i}.jpg`] = await scene(1000 + i * 10, 900 + i * 15, i + 1);
    globalThis.fetch = (async (u: any) => (imgs[String(u)] ? new Response(imgs[String(u)], { status: 200 }) : new Response('no', { status: 404 }))) as any;
    try {
      const classify = async (bufs: Buffer[]) => bufs.map((_, index) => (index < 2
        ? { index, usable: true, kind: 'product_white', shot: `vue ${index}`, text: 'none', watermark: false, score: 5, note: '' }
        : { index, usable: true, kind: 'infographic', shot: 'schéma', text: 'heavy', watermark: false, score: 4, note: '', cleanBox: null }));
      const out: any = await processProduct({ aliexpress_id: '4', image_urls: Object.keys(imgs) }, { dryRun: true, classify });
      expect(out.photos).toHaveLength(3);
      expect(out.photos.filter((p: any) => p.flags.includes('texte_lourd'))).toHaveLength(1);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe('photos pipeline : sécurité et erreurs', () => {
  it('le minimum de photos est le même pour le tri et pour la mise en ligne', () => {
    expect(PHOTOS_MIN).toBe(GATES_MIN);
  });
  it('isPublicUrl : pas de réseau interne, pas d’identifiants, pas de protocole exotique', () => {
    for (const u of ['https://ae01.alicdn.com/kf/a.jpg', 'http://ae-pic-a1.aliexpress-media.com/kf/b.png']) expect(isPublicUrl(u)).toBe(true);
    for (const u of ['http://localhost/a.jpg', 'http://127.0.0.1/a.jpg', 'http://10.0.0.5/a.jpg', 'http://192.168.1.2/a.jpg', 'http://172.16.0.1/a', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/a', 'http://serveur-interne/a.jpg', 'http://x.internal/a', 'https://user:pw@ae01.alicdn.com/a.jpg', 'file:///etc/passwd', 'ftp://exemple.com/a.jpg', 'pas une url', 'http://2130706433/a.jpg']) expect(isPublicUrl(u)).toBe(false);
    expect(normalizeImageUrl('http://169.254.169.254/latest/meta-data/x.jpg')).toBeNull();
    expect(normalizeImageUrl('//ae01.alicdn.com/kf/Sabc.jpg')).toBe('https://ae01.alicdn.com/kf/Sabc.jpg');
  });
  it('parseClassification : une réponse cassée donne une erreur « tri illisible » (passagère, le worker réessaie)', () => {
    expect(() => parseClassification('pas de json', 2)).toThrow(/tri photos illisible/);
    expect(() => parseClassification('[{"index":0, ', 2)).toThrow(/tri photos illisible/);
  });
});
