'use client';

import { useEffect, useRef, useState } from 'react';
import type { Market } from '@/lib/market';
import { SITE_COPY } from '@/lib/site-copy';

interface Props {
  market: Market;
}

// Carrousel hero — demande Jerome du 03/10 : parmi 10 propositions de
// bannières (texte + décor) soumises en review, il a retenu 4 angles
// (bannières 1, 3, 6, 10 de la proposition) et demandé que le DÉCOR reste
// celui de la bannière 5 (low-poly géométrique) pour les 4, avec seulement
// le texte qui change en fondu — plutôt qu'un carrousel classique où fond +
// texte changent ensemble. Choix assumé : un décor fixe limite le bruit
// visuel, évite tout flash de couleur entre slides, et simplifie beaucoup
// l'implémentation (pas de risque de layout shift dû à un fond qui change de
// taille/forme).
//
// Révision du 03/10 (2e passe, capture à l'appui) : Jerome a demandé de
// retirer la pastille au-dessus du titre et les boutons CTA en dessous du
// sous-titre, d'agrandir le titre pour occuper plus de place dans la
// bannière, de forcer la coupure en 2 lignes propres (phrase blanche /
// phrase orange sur sa propre ligne, centrée — ex. "Les produits qui font
// parler" / "sur les réseaux"), et d'utiliser un orange d'accent un peu
// plus vif que celui du reste du site (site-cta, #FF6B35) sans tomber dans
// le fluo — d'où ACCENT_ORANGE ci-dessous, utilisé seulement ici (le reste
// du site garde site-cta). Plus de CTA dans le hero : la navigation reste
// possible via le menu du header et la section Top Ventes juste en dessous.
const ACCENT_ORANGE = '#FF5A1F';

const ROTATE_MS = 6500;

export default function HeroCarousel({ market }: Props) {
  // Phrases de bannière traduites par marché (03/10, demande Jerome :
  // "traduis tous les textes des 3 sites" + "vérifie les phrases dans la
  // bannière") — avant ce correctif les 4 slides étaient 100% en français,
  // y compris sur tendpick.es et tendpick.com (marché uk/anglophone). Voir
  // lib/site-copy.ts pour les traductions.
  const SLIDES = SITE_COPY[market].hero.slides;
  const slideAria = SITE_COPY[market].hero.slideAria;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (paused || reducedMotionRef.current) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <section
      className="relative overflow-hidden bg-site-primary px-6 py-16 sm:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Décor fixe — repris tel quel de la bannière 5 (low-poly) de la
          proposition, ne change jamais entre les slides. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 800 300"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon points="0,0 160,0 60,120" fill="#4A90D9" opacity="0.08" />
        <polygon points="700,300 820,300 760,180" fill="#4A90D9" opacity="0.08" />
        <polygon points="620,0 800,0 800,90" fill="#FF6B35" opacity="0.09" />
        <polygon points="0,300 140,300 0,200" fill="#4A90D9" opacity="0.07" />
      </svg>

      <div className="relative z-10 grid [grid-template-areas:'stack']">
        {SLIDES.map((slide, i) => {
          const isActive = i === active;
          return (
            <div
              key={i}
              className={`flex flex-col items-center text-center transition-opacity duration-700 ease-in-out [grid-area:stack] ${
                isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
              aria-hidden={!isActive}
              aria-live={isActive ? 'polite' : undefined}
            >
              <h1 className="mb-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
                <span className="block">{slide.headlineLine1}</span>
                <span className="block" style={{ color: ACCENT_ORANGE }}>
                  {slide.headlineLine2}
                </span>
              </h1>
              <p className="max-w-2xl text-base text-white/70 sm:text-lg">{slide.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 mt-9 flex items-center justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={slideAria(i + 1)}
            aria-current={i === active}
            className={`h-2 rounded-full transition-all ${
              i === active ? 'w-6 bg-site-cta' : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
