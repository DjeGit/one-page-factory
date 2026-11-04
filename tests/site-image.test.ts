import { describe, it, expect } from 'vitest';
import { resolveImage, productCoverUrl } from '@/lib/site-image';

describe('resolveImage (next/image ne doit jamais planter)', () => {
  it('rejette les valeurs vides ou inutilisables', () => {
    expect(resolveImage(null)).toBeNull();
    expect(resolveImage('')).toBeNull();
    expect(resolveImage('   ')).toBeNull();
    expect(resolveImage('dossier/photo-sans-domaine')).toBeNull();
    expect(resolveImage('javascript:alert(1)')).toBeNull();
    expect(resolveImage('data:image/png;base64,AAAA')).toBeNull();
  });
  it('un chemin local passe par l’optimiseur', () => {
    expect(resolveImage('/icon.svg')).toEqual({ src: '/icon.svg', unoptimized: false });
    expect(resolveImage('//evil.example/x.png')).toBeNull();
  });
  it('un hôte déclaré dans next.config.js passe par l’optimiseur', () => {
    expect(resolveImage('https://images.pexels.com/photos/1/x.jpg')?.unoptimized).toBe(false);
    expect(resolveImage('https://m.media-amazon.com/images/I/x.jpg')?.unoptimized).toBe(false);
    expect(resolveImage('https://images-na.ssl-images-amazon.com/x.jpg')?.unoptimized).toBe(false);
  });
  it('un hôte inconnu est servi tel quel (jamais d’erreur next/image)', () => {
    expect(resolveImage('https://ae01.alicdn.com/kf/abc.jpg')).toEqual({ src: 'https://ae01.alicdn.com/kf/abc.jpg', unoptimized: true });
    expect(resolveImage('http://images.pexels.com/x.jpg')?.unoptimized).toBe(true);
  });
  it('une URL Cloudinary déjà transformée n’est pas retraitée par Next', () => {
    expect(resolveImage('https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill/q_auto/f_auto/photo.jpg')?.unoptimized).toBe(true);
    expect(resolveImage('https://res.cloudinary.com/demo/image/fetch/w_400,h_400,c_fill/q_auto/f_auto/https%3A%2F%2Fx.com%2Fa.jpg')?.unoptimized).toBe(true);
    // Image Cloudinary d'origine, non redimensionnée : l'optimiseur de Next est utile.
    expect(resolveImage('https://res.cloudinary.com/demo/image/upload/v123/photo.jpg')?.unoptimized).toBe(false);
  });
});

describe('productCoverUrl', () => {
  it('prend la 1re photo de la galerie, sinon image_url, sinon null', () => {
    expect(productCoverUrl({ images: ['https://a.example/1.jpg', 'https://a.example/2.jpg'], image_url: 'https://a.example/old.jpg' })).toContain('1.jpg');
    expect(productCoverUrl({ images: [], image_url: 'https://a.example/old.jpg' })).toContain('old.jpg');
    expect(productCoverUrl({ images: ['', '  '], image_url: null })).toBeNull();
    expect(productCoverUrl({ image_url: null })).toBeNull();
  });
});
