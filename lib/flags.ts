/**
 * Interrupteurs éditoriaux / conformité.
 *
 * SHOW_PRICES = false : aucun prix n'est affiché sur le site public.
 * Raison : le programme Amazon Associates n'autorise l'affichage d'un prix
 * que s'il est servi par Amazon (lien / API Produits) ou accompagné d'un
 * horodatage + avertissement. Nos prix proviennent d'une synchro interne, donc
 * on les masque (décision du 18/10/2026). Pour les réafficher un jour : passer
 * à true une fois les prix servis via l'API Amazon avec horodatage.
 *
 * SHOW_TESTIMONIALS = false : les « témoignages » étaient entièrement générés
 * par l'IA (noms fictifs, note à 5). Retirés (décision du 18/10/2026).
 */
export const SHOW_PRICES = false;
export const SHOW_TESTIMONIALS = false;

/**
 * SHOW_MERCHANT_PRICES = true : on affiche le prix relevé chez le marchand
 * (AliExpress…) UNIQUEMENT si le produit a une date de relevé
 * (price_checked_at). Le prix est suivi d'un astérisque et d'une mention
 * encadrée « prix à confirmer avec le revendeur » (décision du 01/11/2026).
 * Les produits Amazon restent masqués tant que SHOW_PRICES = false.
 *
 * Règle commune (lib/pricing.ts, getPublishablePrice) : un prix sans date de
 * relevé valide n'est JAMAIS publié, quel que soit le réglage — ni sur la
 * page, ni dans les données structurées Google (JSON-LD), qui reprennent
 * exactement le prix et la devise affichés.
 */
export const SHOW_MERCHANT_PRICES = true;
