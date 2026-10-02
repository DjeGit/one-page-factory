'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// Carrousel hero — demande Jerome du 03/10 : parmi 10 propositions de
// bannières (texte + décor) soumises en review, il a retenu 4 angles
// (bannières 1, 3, 6, 10 de la proposition) et demandé que le DÉCOR reste
// celui de la bannière 5 (low-poly géométrique) pour les 4, avec seulement
// le texte qui change en fondu — plutôt qu'un carrousel classique où fond +
// texte changent ensemble. Choix assumé : un décor fixe limite le bruit
// visuel, évite tout flash de couleur entre slides, et simplifie beaucoup
// l'implémentation (pas de risque de layout shift dû à un fond qui change de
// taille/forme). Les CTA pointent vers les mêmes pages que l'ancien hero
// statique (/produits, /top-ventes) — aucune nouvelle route n'existe pour
// "nouveautés" ou "tendances", et /produits trie déjà par mise à jour
// récente, donc c'est la bonne cible.
const SLIDES = [
  {
    badge: 'Sélection mise à jour chaque semaine',
    headline: 'De nouveaux produits repérés',
    headlineAccent: 'chaque semaine',
    subtitle:
      "Notre veille identifie en continu ce qui émerge sur Amazon, Rakuten et AliExpress. Chaque fiche résume l'essentiel pour décider vite.",
    ctaPrimary: 'Voir les nouveautés →',
  },
  {
    badge: 'Sélection passée au crible',
    headline: 'Une sélection pensée,',
    headlineAccent: 'pas improvisée',
    subtitle:
      "Chaque produit référencé passe par une grille de critères avant d'apparaître ici. On privilégie la pertinence à la quantité.",
    ctaPrimary: 'Découvrir la sélection →',
  },
  {
    badge: 'Ce dont on parle en ligne',
    headline: 'Les produits qui font parler',
    headlineAccent: 'sur les réseaux',
    subtitle:
      'On suit les tendances qui émergent sur les réseaux sociaux et on vous présente les produits concernés, avec une fiche complète pour juger par vous-même.',
    ctaPrimary: 'Voir les tendances →',
  },
  {
    badge: 'Sélection vérifiée, zéro arnaque',
    headline: 'Une sélection vérifiée,',
    headlineAccent: 'en toute confiance',
    subtitle: 'Chaque produit référencé est vérifié avant publication. Pas de fausses promesses, juste une information fiable.',
    ctaPrimary: 'Découvrir en confiance →',
  },
] as const;

const ROTATE_MS = 6500;

export default function HeroCarousel() {
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
      className="relative overflow-hidden bg-site-primary px-6 py-10 sm:py-14"
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
              key={slide.headlineAccent}
              className={`flex flex-col items-center gap-2 text-center transition-opacity duration-700 ease-in-out [grid-area:stack] ${
                isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
              aria-hidden={!isActive}
              aria-live={isActive ? 'polite' : undefined}
            >
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/80">
                <span className="h-2 w-2 rounded-full bg-site-cta animate-pulse" />
                {slide.badge}
              </div>
              <h1 className="mb-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
                {slide.headline} <span className="text-site-cta">{slide.headlineAccent}</span>
              </h1>
              <p className="mb-6 max-w-2xl text-base text-white/70 sm:text-lg">{slide.subtitle}</p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/produits"
                  className="rounded-lg bg-site-cta px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-site-cta-hover"
                  tabIndex={isActive ? 0 : -1}
                >
                  {slide.ctaPrimary}
                </Link>
                <Link
                  href="/top-ventes"
                  className="text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-white"
                  tabIndex={isActive ? 0 : -1}
                >
                  Voir le Top Ventes
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 mt-7 flex items-center justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.headlineAccent}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Aller à la bannière ${i + 1}`}
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
