import type { Market } from '@/lib/market';
import { CONSENT_COPY } from '@/lib/consent-copy';

interface AffiliateDisclosureBannerProps {
  market: Market;
}

/**
 * Bandeau de disclosure affilié, visible AVANT le clic, en haut de page —
 * exigence loi influenceurs (FR), code de conduite Autocontrol (ES) et CAP
 * Code (UK) : la mention ne doit pas être reléguée au footer. Le paragraphe
 * détaillé existant dans le footer reste ; ce bandeau en est le rappel
 * court et immédiat. Localisé sur le marché du PRODUIT, pas du visiteur.
 *
 * Restylé le 06/10 (nouvelle page produit) : fond bleu très clair aux
 * couleurs du site catalogue, à la place de l'ancien gris foncé de la
 * one-page — le texte légal, lui, est inchangé.
 */
export default function AffiliateDisclosureBanner({ market }: AffiliateDisclosureBannerProps) {
  return (
    <div className="bg-[#EAF2FB] border-b border-site-border text-center py-2 px-4 text-xs text-site-text-secondary">
      {CONSENT_COPY[market].disclosureBanner}
    </div>
  );
}
