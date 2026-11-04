import Image from 'next/image';
import { resolveImage } from '@/lib/site-image';

interface Props {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Visuel affiché quand il n'y a pas d'image exploitable. */
  fallback?: React.ReactNode;
}

/**
 * Image « remplissante » (le parent est en `relative` avec une taille) qui ne
 * plante jamais : source vide, invalide ou hôte non déclaré => pas d'erreur
 * next/image, on affiche le visuel de remplacement ou l'image brute.
 */
export default function SiteImage({ src, alt, sizes, className, priority, fallback }: Props) {
  const img = resolveImage(src);
  if (!img) {
    return (
      <>
        {fallback ?? (
          <div className="w-full h-full flex items-center justify-center text-4xl text-site-border" aria-hidden="true">
            📦
          </div>
        )}
      </>
    );
  }
  return (
    <Image
      src={img.src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      priority={priority}
      unoptimized={img.unoptimized}
    />
  );
}
