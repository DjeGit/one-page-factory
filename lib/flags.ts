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
