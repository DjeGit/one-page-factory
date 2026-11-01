import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
// @ts-ignore — module Node pur (.mjs) sans déclaration de types
import { normalizeImageUrl, dedupe, toSquareJpeg, pickBest, parseClassification, processProduct } from '../scripts/photos/pipeline.mjs';

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

  it('parseClassification tolère le texte autour et complète les index manquants', () => {
    const r = parseClassification('Voici :\n[{"index":0,"usable":true,"kind":"product_white","text":"none","score":9}]', 2);
    expect(r[0].score).toBe(5);
    expect(r[1].usable).toBe(false);
    expect(r[1].text).toBe('heavy');
    expect(() => parseClassification('rien', 1)).toThrow();
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
});
