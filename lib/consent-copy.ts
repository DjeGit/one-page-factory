/**
 * Copie centralisée fr/es/uk pour tout ce qui touche au consentement
 * cookies et à la disclosure affiliée sur les pages publiques Tendpick.
 *
 * Point d'entrée unique pour ces textes — CookieConsent.tsx,
 * LandingFooter.tsx et AffiliateDisclosureBanner.tsx piochent ici plutôt
 * que de dupliquer des chaînes en dur par composant. Marché = marché du
 * PRODUIT (product.market), pas la préférence du visiteur (voir
 * app/[slug]/page.tsx) — la disclosure doit refléter le contenu affiché,
 * pas qui le regarde.
 */

import type { Market } from '@/lib/market';

interface CookieBannerCopy {
  title: string;
  body: string;
  learnMore: string;
  decline: string;
  accept: string;
}

interface ConsentCopy {
  cookieBanner: CookieBannerCopy;
  /** Bandeau court, visible avant le clic, en haut de page. */
  disclosureBanner: string;
  /** Paragraphe détaillé dans le footer (existant, désormais localisé). */
  footerDisclosure: string;
}

export const CONSENT_COPY: Record<Market, ConsentCopy> = {
  fr: {
    cookieBanner: {
      title: '🍪 Ce site utilise des cookies',
      body: "Nous utilisons des cookies pour mesurer l'audience et améliorer votre expérience. Certains partenaires (Amazon, Meta, TikTok) peuvent également en déposer pour vous proposer des publicités pertinentes.",
      learnMore: 'En savoir plus',
      decline: 'Refuser',
      accept: 'Accepter',
    },
    disclosureBanner:
      '📢 Publicité — Cette page contient des liens affiliés Amazon. Nous touchons une commission sur les achats éligibles, sans supplément de prix pour vous.',
    footerDisclosure:
      "Information importante : Tendpick est un site participatif au programme d'affiliation d'Amazon EU. En tant que partenaire Amazon, nous réalisons un bénéfice sur les achats remplissant les conditions requises. Cela n'affecte pas le prix que vous payez. Les avis et recommandations présents sur ce site sont rédigés à titre informatif.",
  },
  es: {
    cookieBanner: {
      title: '🍪 Este sitio utiliza cookies',
      body: 'Utilizamos cookies para medir la audiencia y mejorar tu experiencia. Algunos socios (Amazon, Meta, TikTok) también pueden utilizarlas para mostrarte publicidad relevante.',
      learnMore: 'Saber más',
      decline: 'Rechazar',
      accept: 'Aceptar',
    },
    disclosureBanner:
      '📢 Publicidad — Esta página contiene enlaces de afiliados de Amazon. Recibimos una comisión por las compras que cumplan los requisitos, sin coste adicional para ti.',
    footerDisclosure:
      'Información importante: Tendpick participa en el Programa de Afiliados de Amazon EU. Como socio de Amazon, obtenemos ingresos por las compras que cumplan los requisitos aplicables. Esto no afecta al precio que pagas. Las reseñas y recomendaciones de este sitio tienen fines informativos.',
  },
  uk: {
    cookieBanner: {
      title: '🍪 This site uses cookies',
      body: 'We use cookies to measure audience and improve your experience. Some partners (Amazon, Meta, TikTok) may also use them to show you relevant ads.',
      learnMore: 'Learn more',
      decline: 'Decline',
      accept: 'Accept',
    },
    disclosureBanner:
      '📢 Advertising — This page contains Amazon affiliate links. We earn a commission on qualifying purchases, at no extra cost to you.',
    footerDisclosure:
      "Important information: Tendpick is a participant in the Amazon EU Associates Programme. As an Amazon Associate, we earn from qualifying purchases. This does not affect the price you pay. Reviews and recommendations on this site are for informational purposes.",
  },
};

/** Nom de l'event DOM émis par CookieConsent au choix de l'utilisateur, écouté par PixelInjector. */
export const CONSENT_CHANGED_EVENT = 'cookie-consent-changed';
export type ConsentValue = 'accepted' | 'declined';
