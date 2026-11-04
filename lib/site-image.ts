import { getCloudinaryUrl } from '@/lib/cloudinary';
import { getProductGallery } from '@/lib/product-images';
import type { Product } from '@/types';

/**
 * Images du site public.
 *
 * Deux pièges évités ici :
 *  1. next/image LÈVE UNE ERREUR (page en 500) quand l'hôte de l'image n'est
 *     pas déclaré dans next.config.js (images.remotePatterns) — par exemple
 *     une photo AliExpress quand Cloudinary n'est pas configuré, ou une
 *     couverture d'article collée depuis un autre site. On détecte ces cas et
 *     on sert l'image telle quelle (unoptimized) au lieu de planter.
 *  2. Les URL Cloudinary sont déjà redimensionnées/compressées côté
 *     Cloudinary (w_, h_, f_auto, q_auto) : repasser par l'optimiseur de Next
 *     refait le travail sur le CPU du serveur (un seul process Node). On les
 *     sert donc telles quelles.
 */

// Miroir de images.remotePatterns de next.config.js (à tenir à jour avec lui).
const OPTIMIZABLE_HOSTS: RegExp[] = [
  /^res\.cloudinary\.com$/,
  /^images\.unsplash\.com$/,
  /^images\.pexels\.com$/,
  /^m\.media-amazon\.com$/,
  /^[^.]+\.media-amazon\.com$/,
  /^[^.]+\.ssl-images-amazon\.com$/,
];

export interface ResolvedImage {
  src: string;
  /** true => next/image ne doit pas passer par son optimiseur. */
  unoptimized: boolean;
}

/**
 * Prépare une source d'image pour next/image, ou null si elle ne peut pas
 * être affichée (chemin relatif invalide, valeur vide…) : l'appelant affiche
 * alors son visuel de remplacement.
 */
export function resolveImage(src: string | null | undefined): ResolvedImage | null {
  const value = (src ?? '').trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return { src: value, unoptimized: false };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  if (host === 'res.cloudinary.com') {
    // Déjà transformée par Cloudinary (largeur, recadrage ou fetch) ?
    const transformed = /\/(?:upload|fetch)\/(?:[^/]*,)?(?:w_|h_|c_)/.test(url.pathname) || url.pathname.includes('/fetch/');
    return { src: value, unoptimized: transformed };
  }
  const known = url.protocol === 'https:' && OPTIMIZABLE_HOSTS.some((re) => re.test(host));
  return { src: value, unoptimized: !known };
}

/** Photo de couverture d'un produit (1re de la galerie, sinon image_url), en URL de la taille demandée. */
export function productCoverUrl(
  product: Pick<Product, 'images' | 'image_url'>,
  size = 400,
): string | null {
  const cover = getProductGallery(product)[0];
  if (!cover) return null;
  return getCloudinaryUrl(cover, { width: size, height: size, crop: 'fill', format: 'auto', quality: 'auto' });
}
