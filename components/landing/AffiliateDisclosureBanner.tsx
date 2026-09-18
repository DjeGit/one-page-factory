import type { Market } from '@/lib/market';
import { CONSENT_COPY } from '@/lib/consent-copy';

interface AffiliateDisclosureBannerProps {
  market: Market;
}

/**
 * Bandeau de disclosure affilié, visible AVANT le clic, en haut de page —
 * exigence loi influenceurs (FR), code de conduite Autocontrol (ES) et CAP
 * Code (UK) : la mention ne doit pas être reléguée au footer. Le paragraphe
 * détaillé existant dans LandingFooter reste ; ce bandeau en est le rappel
 * court et immédiat. Localisé sur le marché du PRODUIT, pas du visiteur.
 */
export default function AffiliateDisclosureBanner({ market }: AffiliateDisclosureBannerProps) {
  return (
    <div className="bg-gray-900/80 border-b border-white/10 text-center py-2 px-4 text-xs text-gray-400">
      {CONSENT_COPY[market].disclosureBanner}
    </div>
  );
}
