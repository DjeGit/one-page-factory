import type { Product } from '@/types';

/**
 * Galerie d'un produit (06/10) : `images` si renseigné, sinon l'ancien champ
 * unique `image_url` — les produits créés avant la galerie (import CSV,
 * pipeline de découverte, ajout manuel) continuent donc d'avoir une photo
 * sans migration de données côté code.
 */
export function getProductGallery(product: Pick<Product, 'images' | 'image_url'>): string[] {
  const list = (product.images ?? []).filter((v) => typeof v === 'string' && v.trim() !== '');
  if (list.length > 0) return list;
  return product.image_url ? [product.image_url] : [];
}
