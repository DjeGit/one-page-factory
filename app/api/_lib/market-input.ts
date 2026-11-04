/** Champs modifiables d'une ligne d'étude de marché (market_products) saisie à la main. */
const TEXT = ['category', 'name', 'description', 'best_offer', 'source_notes', 'source'] as const;
const MONEY = ['price_min', 'price_max', 'price_avg', 'best_offer_price'] as const;

export function pickMarketProductFields(body: Record<string, unknown>, mode: 'create' | 'update'): { data: Record<string, unknown> } | { error: string } {
  const data: Record<string, unknown> = {};
  for (const k of TEXT) {
    if (!(k in body)) continue;
    const v = body[k];
    if (v === null || v === undefined || v === '') { data[k] = null; continue; }
    if (typeof v !== 'string' || v.length > 5000) return { error: `Champ invalide : ${k}` };
    data[k] = v.trim();
  }
  for (const k of MONEY) {
    if (!(k in body)) continue;
    const v = body[k];
    if (v === null || v === undefined || v === '') { data[k] = null; continue; }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 10_000_000) return { error: `Montant invalide : ${k}` };
    data[k] = n;
  }
  // Les deux scores sont des entiers 1..10 (contrainte de la table).
  for (const k of ['confidence_score', 'trend_score'] as const) {
    if (!(k in body)) continue;
    const n = Number(body[k]);
    if (!Number.isInteger(n) || n < 1 || n > 10) return { error: `${k} doit être un entier entre 1 et 10` };
    data[k] = n;
  }
  if ('platforms' in body) {
    const p = body.platforms;
    if (!Array.isArray(p) || p.length > 20 || p.some((x) => typeof x !== 'string' || x.length > 100)) return { error: 'platforms doit être une liste de textes' };
    data.platforms = p;
  }
  if (mode === 'create' && (typeof data.name !== 'string' || !data.name || typeof data.category !== 'string' || !data.category)) {
    return { error: 'Le nom et la catégorie sont requis' };
  }
  return { data };
}
