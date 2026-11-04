import Link from 'next/link';
import type { Product } from '@/types';
import type { Market } from '@/lib/market';
import { SITE_COPY } from '@/lib/site-copy';
import { getCardPrice } from '@/lib/pricing';
import { productCoverUrl } from '@/lib/site-image';
import { TOP_VENTES_SOURCES, getProductSource } from '@/lib/top-ventes';
import FreeShippingBadge from '@/components/product/FreeShippingBadge';
import SiteImage from '@/components/site/SiteImage';

interface Props {
  product: Product;
  market: Market;
  /**
   * 'boxed' : carte à photo encadrée (accueil, fiche « vous aimerez aussi »).
   * 'tile'  : vignette pleine largeur (catalogue, catégories, top ventes).
   */
  variant?: 'boxed' | 'tile';
  /** Lien et libellé « voir » à droite du prix (variante tile). */
  showSeeArrow?: boolean;
}

/**
 * Vignette produit UNIQUE du site (avant : 5 copies légèrement différentes
 * qui divergeaient — photo de galerie oubliée, prix avec astérisque, badge
 * de livraison absent selon la page).
 *
 * Règles (décision Jerome du 03/11/2026) : sous la photo, le prix SANS
 * astérisque (l'astérisque, la date et la mention « prix à confirmer » sont
 * sur la fiche) et la pastille « Livraison gratuite » quand elle s'applique.
 * Sans prix daté, on dit « Prix chez le marchand » plutôt que d'inventer.
 */
export default function ProductCard({ product: p, market, variant = 'tile', showSeeArrow = true }: Props) {
  const t = SITE_COPY[market];
  const cover = productCoverUrl(p, 400);
  const sourceMeta = TOP_VENTES_SOURCES.find((s) => s.key === getProductSource(p.affiliate_url));
  const price = getCardPrice(p, t.product.locale, market);
  const title = p.hero_title || p.name;

  const priceLine = price ? (
    <span className="text-site-cta font-bold text-base">{price}</span>
  ) : (
    <span className="text-site-text-secondary text-xs">{t.common.priceAtMerchant}</span>
  );
  const badge = p.free_shipping ? (
    <span className="self-start">
      <FreeShippingBadge size="small" label={t.common.freeShipping} />
    </span>
  ) : null;

  if (variant === 'boxed') {
    return (
      <Link
        href={`/${p.slug}`}
        className="bg-white border border-site-border rounded-xl p-4 flex flex-col gap-2 hover:border-site-secondary hover:shadow-md transition-all hover:-translate-y-0.5 group"
      >
        <div className="h-40 relative bg-site-bg rounded-lg overflow-hidden flex-shrink-0">
          <SiteImage
            src={cover}
            alt={p.name}
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        {sourceMeta && <span className="text-xs text-site-text-secondary">{sourceMeta.label}</span>}
        <p className="text-[15px] font-semibold text-site-text line-clamp-2 leading-snug">{title}</p>
        {priceLine}
        {badge}
      </Link>
    );
  }

  return (
    <Link
      href={`/${p.slug}`}
      className="bg-white border border-site-border rounded-xl overflow-hidden hover:border-site-secondary hover:shadow-md transition-all hover:-translate-y-0.5 group flex flex-col"
    >
      <div className="aspect-square relative bg-site-bg flex-shrink-0">
        <SiteImage
          src={cover}
          alt={p.name}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {sourceMeta && (
          <span className="absolute top-2 left-2 bg-white/95 border border-site-border rounded-full px-2 py-0.5 text-xs font-medium text-site-text-secondary flex items-center gap-1">
            <span aria-hidden="true">{sourceMeta.icon}</span>
            {sourceMeta.label}
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-sm font-medium text-site-text line-clamp-2 leading-snug flex-1">{title}</p>
        <div className="flex items-center justify-between gap-2">
          {priceLine}
          {showSeeArrow && (
            <span className="text-xs text-site-text-secondary group-hover:text-site-secondary transition-colors shrink-0">
              {t.common.seeArrow}
            </span>
          )}
        </div>
        {badge}
      </div>
    </Link>
  );
}
