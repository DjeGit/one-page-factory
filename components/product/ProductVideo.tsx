'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

interface Props {
  videoId: string;
  title: string;
  labels: { play: string; watchOnYoutube: string };
}

// Miniature cliquable : le lecteur YouTube (domaine sans cookies) n'est chargé qu'au clic, donc
// aucun cookie ni script tiers à l'ouverture de la page. Un lien « Regarder sur YouTube » reste
// disponible si le lecteur ne s'affiche pas.
export default function ProductVideo({ videoId, title, labels }: Props) {
  const [playing, setPlaying] = useState(false);
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div className="max-w-[820px]">
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-site-border bg-black">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={labels.play}
            className="group absolute inset-0 w-full h-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
              alt={title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <span className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" aria-hidden="true" />
            <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <span className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                <Play className="w-7 h-7 text-site-primary translate-x-0.5" fill="currentColor" />
              </span>
            </span>
          </button>
        )}
      </div>
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-2.5 text-sm text-site-text-secondary hover:text-site-cta transition-colors"
      >
        {labels.watchOnYoutube}
      </a>
    </div>
  );
}
