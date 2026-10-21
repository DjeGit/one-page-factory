/**
 * Guide d'achat (21/10) — sorti de la catégorie « blog » et promu en section
 * à part entière du site, avec son entrée dans le menu (entre les catégories
 * et le Blog). Les contenus restent des lignes de la table blog_posts (même
 * éditeur dans /admin/blog), rangées dans la catégorie `guides-achat` :
 *  - l'article « pilier » (guide général, un par marché) est servi par
 *    /guide-achat ;
 *  - les futurs guides par produit sont servis par /guide-achat/[slug] ;
 *  - ils n'apparaissent plus dans /blog ni dans « Depuis le blog ».
 */
import type { Market } from '@/lib/market';

export const GUIDE_CATEGORY_SLUG = 'guides-achat';
export const GUIDE_BASE_PATH = '/guide-achat';

/** Slug de l'article pilier de chaque marché (import-blog-guides-achat.sql). */
export const GUIDE_PILLAR_SLUG: Record<Market, string> = {
  fr: 'acheter-sur-internet-en-securite-guide',
  es: 'comprar-por-internet-de-forma-segura-guia',
  uk: 'how-to-shop-online-safely-guide',
};

export function isGuidePillar(market: Market, slug: string): boolean {
  return GUIDE_PILLAR_SLUG[market] === slug;
}

/** Chemin public d'un contenu du guide : le pilier vit sur /guide-achat. */
export function guidePostPath(market: Market, slug: string): string {
  return isGuidePillar(market, slug) ? GUIDE_BASE_PATH : `${GUIDE_BASE_PATH}/${slug}`;
}
