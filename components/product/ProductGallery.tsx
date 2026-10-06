'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { getCloudinaryUrl } from '@/lib/cloudinary';

interface Props {
  images: string[];
  alt: string;
  labels: {
    galleryAria: string;
    // Une chaîne par photo, calculée côté serveur : une fonction ne peut pas
    // traverser la frontière serveur → composant client.
    photoAria: string[];
    prevPhoto: string;
    nextPhoto: string;
    zoomHint: string;
    noPhoto: string;
  };
}

// Galerie produit — maquette A (06/10) : rail de miniatures à gauche (sous
// la photo sur mobile), grande photo carrée, zoom au survol sur desktop,
// glisser du doigt pour changer de photo sur mobile. Les images sont déjà
// recadrées en carré à l'upload (app/api/upload) ; object-cover ici n'est
// qu'un filet pour les images ajoutées par simple URL.
export default function ProductGallery({ images, alt, labels }: Props) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const touchStartX = useRef<number | null>(null);

  const total = images.length;
  const safeIndex = Math.min(index, Math.max(total - 1, 0));

  if (total === 0) {
    return (
      <div
        role="img"
        aria-label={labels.noPhoto}
        className="w-full aspect-square rounded-2xl border border-site-border bg-white flex flex-col items-center justify-center gap-2 text-site-text-secondary"
      >
        <ImageOff className="w-10 h-10 opacity-40" aria-hidden="true" />
        <span className="text-sm">{labels.noPhoto}</span>
      </div>
    );
  }

  const go = (delta: number) => setIndex((safeIndex + delta + total) % total);

  const mainSrc = getCloudinaryUrl(images[safeIndex], {
    width: 1000,
    height: 1000,
    crop: 'fill',
    format: 'auto',
    quality: 'auto',
  });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoom({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  function onTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null || total < 2) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  }

  return (
    <div
      role="group"
      aria-label={labels.galleryAria}
      className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-start"
    >
      {total > 1 && (
        <ul className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-visible sm:w-[76px] flex-shrink-0 pb-1 sm:pb-0">
          {images.map((img, i) => {
            const thumb = getCloudinaryUrl(img, {
              width: 160,
              height: 160,
              crop: 'fill',
              format: 'auto',
              quality: 'auto',
            });
            const active = i === safeIndex;
            return (
              <li key={`${img}-${i}`} className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={labels.photoAria[i]}
                  aria-current={active ? 'true' : undefined}
                  className={`relative block w-16 h-16 sm:w-[76px] sm:h-[76px] rounded-[10px] overflow-hidden bg-white border-2 transition-colors ${
                    active ? 'border-site-primary' : 'border-site-border hover:border-site-secondary'
                  }`}
                >
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    sizes="76px"
                    className="object-cover"
                    unoptimized={thumb.includes('/fetch/')}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex-1 min-w-0">
        <div
          className="group relative w-full aspect-square rounded-2xl border border-site-border bg-white overflow-hidden sm:cursor-zoom-in"
          onMouseMove={onMouseMove}
          onMouseLeave={() => setZoom(null)}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={onTouchEnd}
        >
          <Image
            key={mainSrc}
            src={mainSrc}
            alt={alt}
            fill
            priority={safeIndex === 0}
            sizes="(max-width: 640px) 100vw, 55vw"
            className="object-cover transition-transform duration-150 ease-out"
            style={
              zoom
                ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` }
                : undefined
            }
            unoptimized={mainSrc.includes('/fetch/')}
          />

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={labels.prevPhoto}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border border-site-border flex items-center justify-center text-site-primary hover:border-site-secondary sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={labels.nextPhoto}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border border-site-border flex items-center justify-center text-site-primary hover:border-site-secondary sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </button>
              <span className="absolute left-3 bottom-3 bg-site-primary/85 text-white text-xs font-semibold rounded-full px-3 py-1">
                {safeIndex + 1} / {total}
              </span>
            </>
          )}

          <span className="hidden sm:block absolute right-3 bottom-3 bg-white border border-site-border rounded-full px-3 py-1.5 text-xs text-site-text-secondary pointer-events-none">
            {labels.zoomHint}
          </span>
        </div>
      </div>
    </div>
  );
}
