// Offre AliExpress d'un candidat sur chaque marché : produit présent ? lien affilié vérifié ? prix cohérent ?
import { MAX_PRICE_GAP, isAliexpressLink, isNeutralAliexpressUrl, priceGap } from './gates.mjs';

export const MARKETS = ['fr', 'es', 'uk'];
export const CURRENCY = { fr: 'EUR', es: 'EUR', uk: 'GBP' };

const idFromUrl = (u) => (String(u || '').match(/\/item\/(\d{6,})/) || [])[1] || null;

/** Identifiant AliExpress à interroger pour un marché (le UK a souvent sa propre annonce). */
export function itemIdFor(candidate, market) {
  return idFromUrl(market === 'uk' ? candidate.url_uk : candidate.url_fr) || candidate.aliexpress_id;
}

/**
 * Produit « de confiance » (décision Jerome du 05/11/2026) : bien noté ET assez vendu / commenté. Pour lui, le prix de l'API est
 * cru sans comparaison avec la recherche ; seul un écart énorme (prix doublé ou divisé par deux) reste bloquant, pour attraper
 * une erreur de l'API (mauvaise variante, prix factice) et non une variation normale.
 */
export const TRUSTED_MIN_RATING = 4.5;
export const TRUSTED_MIN_REVIEWS = 50;
export const TRUSTED_MIN_SALES = 500;
export const TRUSTED_MAX_GAP = 1.0;
export function isTrusted(candidate) {
  const rating = Number(candidate.rating);
  const reviews = Number(candidate.reviews) || 0;
  const sales = Number(candidate.sales) || 0;
  return Number.isFinite(rating) && rating >= TRUSTED_MIN_RATING && (reviews >= TRUSTED_MIN_REVIEWS || sales >= TRUSTED_MIN_SALES);
}

/**
 * Prix de référence d'un marché : celui de la recherche pour ce marché, sinon (France <-> Espagne, même devise EUR) celui de l'autre.
 * La recherche de la semaine a souvent été faite sur un seul pays (70 produits sur 80 n'ont que le prix ES) : sans cela, la France
 * restait bloquée alors que le prix de l'API est cohérent. Le UK (GBP) n'emprunte rien : pas de conversion de devise ici.
 * @returns {{price:number|null, from:string|null}}
 */
export function referencePrice(candidate, market) {
  const own = candidate[`price_${market}`];
  if (own != null && Number(own) > 0) return { price: Number(own), from: market };
  const other = market === 'fr' ? 'es' : market === 'es' ? 'fr' : null;
  const borrowed = other ? candidate[`price_${other}`] : null;
  if (borrowed != null && Number(borrowed) > 0) return { price: Number(borrowed), from: other };
  return { price: null, from: null };
}

/** Pas d'annonce UK repérée lors de la recherche (ni lien, ni prix) : on ne l'invente pas. */
export const isUkUnavailable = (c) => !c.url_uk && c.price_uk == null;

/**
 * Les contrôles de ce fichier ne dépendent pas de `deps.verify` : même si la vérification du lien était contournée ou simulée,
 * un marché n'est « ok » que si le lien est un vrai lien affilié, la devise celle du marché et le prix proche de celui de la recherche.
 * @param {object} candidate  ligne trend_candidates
 * @param {{getProduct:(id:string,market:string)=>Promise<object|null>, verify:(arg:object)=>Promise<{ok:boolean,checks:{name:string,ok:boolean,detail:string}[]}>}} deps
 * @returns {Promise<{market:string,itemId:string,status:'ok'|'unavailable'|'blocked'|'error',reasons:string[],detail?:object,gap?:number|null}[]>}
 */
export async function collectOffers(candidate, deps, markets = MARKETS) {
  const out = [];
  const trusted = isTrusted(candidate);
  const maxGap = trusted ? TRUSTED_MAX_GAP : MAX_PRICE_GAP;
  for (const market of markets) {
    const itemId = itemIdFor(candidate, market);
    const { price: expectedPrice, from: priceFrom } = referencePrice(candidate, market);
    if (market === 'uk' && isUkUnavailable(candidate)) {
      out.push({ market, itemId, status: 'unavailable', reasons: ["pas d'annonce UK repérée lors de la recherche"] });
      continue;
    }
    try {
      const detail = await deps.getProduct(itemId, market);
      if (!detail || !detail.promotionLink) {
        out.push({ market, itemId, status: 'unavailable', reasons: ['produit introuvable pour ce pays (ou hors programme affilié)'] });
        continue;
      }
      if (!detail.price || !detail.currency) {
        out.push({ market, itemId, status: 'blocked', reasons: ["pas de prix renvoyé par l'API : on n'affiche pas le produit"], detail });
        continue;
      }
      if (isNeutralAliexpressUrl(detail.promotionLink) || !isAliexpressLink(detail.promotionLink)) {
        out.push({ market, itemId, status: 'blocked', reasons: ["l'API n'a pas renvoyé un vrai lien affilié AliExpress"], detail });
        continue;
      }
      if (detail.currency !== CURRENCY[market]) {
        out.push({ market, itemId, status: 'blocked', reasons: [`devise ${detail.currency} au lieu de ${CURRENCY[market]} : l'API ne répond pas pour ce pays`], detail });
        continue;
      }
      const verification = await deps.verify({
        link: detail.promotionLink,
        detail,
        expected: { productId: itemId, currency: CURRENCY[market], price: expectedPrice != null ? Number(expectedPrice) : undefined, tolerance: maxGap },
      });
      const gap = priceGap(expectedPrice, detail.price);
      if (!verification?.ok) {
        const reasons = (verification?.checks || []).filter((c) => !c.ok).map((c) => `${c.name} : ${c.detail}`);
        out.push({ market, itemId, status: 'blocked', reasons: reasons.length ? reasons : ['vérification du lien échouée'], detail, gap });
        continue;
      }
      if (gap == null && trusted) {
        out.push({ market, itemId, status: 'ok', reasons: [], detail, gap, priceFrom, trusted });
        continue;
      }
      if (gap == null) {
        out.push({ market, itemId, status: 'blocked', reasons: ['pas de prix de référence dans la recherche : impossible de contrôler le prix'], detail, gap });
        continue;
      }
      if (gap > maxGap + 1e-9) {
        out.push({ market, itemId, status: 'blocked', reasons: [`prix : écart de ${Math.round(gap * 100)} % avec la recherche (maximum ${Math.round(maxGap * 100)} %)`], detail, gap });
        continue;
      }
      out.push({ market, itemId, status: 'ok', reasons: [], detail, gap, priceFrom, trusted });
    } catch (e) {
      out.push({ market, itemId, status: 'error', reasons: [e.message] });
    }
  }
  return out;
}
