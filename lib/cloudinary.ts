const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export function getCloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: number | 'auto';
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'thumb';
  } = {}
): string {
  if (!CLOUD_NAME) return publicId;

  // If it's already a full URL (not a Cloudinary public ID), return as-is
  if (publicId.startsWith('http://') || publicId.startsWith('https://')) {
    // Check if it's already a Cloudinary URL
    if (publicId.includes('res.cloudinary.com')) {
      return publicId;
    }
    return publicId;
  }

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
  } = options;

  const transformations: string[] = [];

  if (width || height) {
    const dims = [
      width ? `w_${width}` : '',
      height ? `h_${height}` : '',
      `c_${crop}`,
    ]
      .filter(Boolean)
      .join(',');
    transformations.push(dims);
  }

  transformations.push(`q_${quality}`);
  transformations.push(`f_${format}`);

  const transformString = transformations.join('/');

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformString}/${publicId}`;
}

export function getProductImageUrl(imageUrl: string | null, width = 800, height = 800): string {
  if (!imageUrl) {
    // Return a placeholder image
    return `https://placehold.co/${width}x${height}/7C3AED/ffffff?text=Produit`;
  }

  return getCloudinaryUrl(imageUrl, { width, height, quality: 'auto', format: 'auto' });
}
