import { MARKETS, type Market } from '@/lib/market';

/**
 * Séquences de relance disponibles. Le rapport initial envisageait un
 * découpage par marché ET par catégorie produit — mais `Product` n'a
 * aujourd'hui aucun champ de catégorie en base (vérifié dans types/index.ts),
 * donc pas de segmentation par catégorie tant que ce champ n'existe pas :
 * mieux vaut une seule séquence par marché que d'inventer une taxonomie.
 * `product_id` reste un filtre possible à l'inscription (lib/nurture ne
 * l'utilise pas pour choisir la séquence, juste pour cibler qui inscrire).
 */
export interface NurtureSequence {
  key: string;
  label: string;
  description: string;
}

export const NURTURE_SEQUENCES: NurtureSequence[] = [
  {
    key: 'default',
    label: 'Relance standard',
    description: "Séquence générique pour les leads qui n'ont pas encore converti (à construire côté Brevo : automation déclenchée par l'ajout à la liste de relance).",
  },
];

export function isValidNurtureSequence(key: string): boolean {
  return NURTURE_SEQUENCES.some((s) => s.key === key);
}

/**
 * Nom de la variable d'env portant l'ID de la liste Brevo de relance pour
 * un marché donné. Séparée de BREVO_LIST_ID_FR/ES/UK (déjà utilisée par la
 * capture de leads dans app/api/leads/route.ts) pour ne jamais mélanger
 * "vient de s'inscrire" et "en cours de relance" — et ne jamais risquer de
 * redéclencher une automation de bienvenue existante en touchant à la
 * première liste.
 */
export function getNurtureListEnvVar(market: Market): string {
  return `NURTURE_LIST_ID_${market.toUpperCase()}`;
}

export function getNurtureListId(market: Market): number | null {
  const raw = process.env[getNurtureListEnvVar(market)];
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function isNurtureConfiguredForMarket(market: Market): boolean {
  return getNurtureListId(market) !== null;
}

export const NURTURE_MARKETS = MARKETS;
