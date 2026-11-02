// Offre AliExpress d'un candidat sur chaque marché : produit présent ? lien affilié vérifié ? prix cohérent ?
import { MAX_PRICE_GAP, priceGap } from './gates.mjs';

export const MARKETS = ['fr', 'es', 'uk'];
export const CURRENCY = { fr: 'EUR', es: 'EUR', uk: 'GBP' };

const idFromUrl = (u) => (String(u || '').match(/\/item\/(\d{6,})/) || [])[1] || null;

/** Identifiant AliExpress à interroger pour un marché (le UK a souvent sa propre annonce). */
export function itemIdFor(candidate, market) {
  return idFromUrl(market === 'uk' ? candidate.url_uk : candidate.url_fr) || candidate.aliexpress_id;
}

/**
 * @param {object} candidate  ligne trend_candidates
 * @param {{getProduct:(id:string,market:string)=>Promise<object|null>, verify:(arg:object)=>Promise<{ok:boolean,checks:{name:string,ok:boolean,detail:string}[]}>}} deps
 * @returns {Promise<{market:string,itemId:string,status:'ok'|'unavailable'|'blocked'|'error',reasons:string[],detail?:object,gap?:number|null}[]>}
 */
export async function collectOffers(candidate, deps, markets = MARKETS) {
  const out = [];
  for (const market of markets) {
    const itemId = itemIdFor(candidate, market);
    const expectedPrice = candidate[`price_${market}`];
    // Pas d'annonce UK repérée lors de la recherche : on ne l'invente pas.
    if (market === 'uk' && !candidate.url_uk && expectedPrice == null) {
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
      const verification = await deps.verify({
        link: detail.promotionLink,
        detail,
        expected: { productId: itemId, currency: CURRENCY[market], price: expectedPrice != null ? Number(expectedPrice) : undefined, tolerance: MAX_PRICE_GAP },
      });
      const gap = priceGap(expectedPrice, detail.price);
      if (!verification?.ok) {
        const reasons = (verification?.checks || []).filter((c) => !c.ok).map((c) => `${c.name} : ${c.detail}`);
        out.push({ market, itemId, status: 'blocked', reasons: reasons.length ? reasons : ['vérification du lien échouée'], detail, gap });
        continue;
      }
      out.push({ market, itemId, status: 'ok', reasons: [], detail, gap });
    } catch (e) {
      out.push({ market, itemId, status: 'error', reasons: [e.message] });
    }
  }
  return out;
}
