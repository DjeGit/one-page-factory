/**
 * Champs modifiables d'un test A/B depuis l'admin. Les compteurs (vues/clics),
 * l'identifiant, le produit et le marché ne se modifient JAMAIS par l'API :
 * avant, le corps de la requête était écrit tel quel dans la table.
 */
const TEXT_FIELDS = [
  'name',
  'variant_a_title', 'variant_a_subtitle', 'variant_a_cta',
  'variant_b_title', 'variant_b_subtitle', 'variant_b_cta',
] as const;

export function pickAbTestFields(body: Record<string, unknown>): { data: Record<string, unknown> } | { error: string } {
  const data: Record<string, unknown> = {};
  for (const k of TEXT_FIELDS) {
    if (!(k in body)) continue;
    const v = body[k];
    if (v === null || v === undefined || v === '') {
      if (k !== 'name') data[k] = null;
      continue;
    }
    if (typeof v !== 'string' || v.length > 500) return { error: `Champ invalide : ${k}` };
    data[k] = v;
  }
  if ('active' in body) {
    if (typeof body.active !== 'boolean') return { error: 'Champ invalide : active' };
    data.active = body.active;
  }
  if ('winner' in body) {
    if (body.winner !== null && body.winner !== 'a' && body.winner !== 'b') return { error: 'Champ invalide : winner' };
    data.winner = body.winner;
  }
  return { data };
}
