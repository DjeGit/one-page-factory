// Règle de décision pour rattacher le lien affilié et le prix du jour (API) à une fiche d'un marché.
// Séparée du script pour pouvoir être testée sans base de données.

/**
 * @param {{market:string, price?:number|null, seller_name?:string|null, commission_rate?:number|null}} row  fiche existante
 * @param {object|null} detail  fiche renvoyée par l'API pour ce marché (parseProductDetail)
 * @param {{ok:boolean, checks:{name:string, ok:boolean, detail:string}[]}|null} verification
 * @param {string} today  date du relevé AAAA-MM-JJ
 * @returns {{action:'update'|'blocked'|'unavailable', patch?:object, reasons?:string[]}}
 */
export function planUpdate(row, detail, verification, today) {
  if (!detail || !detail.promotionLink) return { action: 'unavailable', reasons: ['produit introuvable pour ce pays (ou hors programme affilié)'] };
  if (!verification || !verification.ok) {
    return { action: 'blocked', reasons: (verification?.checks || []).filter((c) => !c.ok).map((c) => `${c.name} : ${c.detail}`) };
  }
  const patch = { affiliate_url: detail.promotionLink };
  // Prix du jour renvoyé par l'API pour ce pays, daté (le site l'affiche avec astérisque et mention « à confirmer »).
  if (detail.price && detail.currency) {
    patch.price = detail.price;
    patch.price_currency = detail.currency;
    patch.price_checked_at = today;
  }
  if (detail.commissionRate != null) patch.commission_rate = detail.commissionRate;
  if (!row.seller_name && detail.shopName) patch.seller_name = detail.shopName;
  return { action: 'update', patch };
}
