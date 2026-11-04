import { getActiveCategories, getSupabaseAdmin } from '@/lib/supabase';
import { ttlCache } from '@/lib/ttl-cache';
import type { Category, Product } from '@/types';
import type { Market } from '@/lib/market';

/**
 * Catalogue public d'un marché : tous les produits EN LIGNE, du plus récent
 * au plus ancien. Une seule requête, mise en cache 60 s, partagée par
 * l'accueil, /produits, /top-ventes (avant : une requête par page et par
 * visite, dont une recherche SQL ILIKE à chaque frappe de visiteur).
 *
 * `select('*')` volontairement : une liste de colonnes explicite casserait
 * tout le site (liste vide) si une migration récente n'était pas encore
 * appliquée sur la base ; `*` s'adapte à ce qui existe.
 */
export async function getMarketCatalog(market: Market): Promise<Product[]> {
  try {
    return await ttlCache(`catalog:${market}`, 60_000, () => fetchMarketCatalog(market));
  } catch (e) {
    // Base injoignable ET aucune valeur précédente en mémoire : page vide plutôt que page en erreur.
    console.error('[catalogue] lecture des produits impossible :', e);
    return [];
  }
}

// Lève une exception en cas d'erreur (au lieu de renvoyer []) : ttlCache peut ainsi
// resservir le dernier catalogue connu pendant une panne de la base, au lieu de
// mettre en cache un catalogue vide.
async function fetchMarketCatalog(market: Market): Promise<Product[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('active', true)
    .eq('market', market)
    .order('updated_at', { ascending: false })
    .limit(1000);
  if (error) throw new Error(`products: ${error.message}`);
  return (data as Product[]) || [];
}

/** Minuscules, sans accents ni ponctuation : « Écouteurs » == « ecouteurs ». */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Recherche dans le catalogue (nom + titre affiché) : tous les mots saisis
 * doivent être présents, sans tenir compte des accents ni de la casse.
 * Faite en mémoire sur le catalogue en cache : aucune requête, et aucune
 * saisie du visiteur n'est jamais insérée dans une requête SQL.
 */
export function searchProducts<T extends Pick<Product, 'name' | 'hero_title'>>(products: T[], rawQuery: string): T[] {
  const terms = normalizeSearch(rawQuery.slice(0, 80)).split(' ').filter(Boolean);
  if (terms.length === 0) return products;
  return products.filter((p) => {
    const haystack = normalizeSearch(`${p.name ?? ''} ${p.hero_title ?? ''}`);
    return terms.every((t) => haystack.includes(t));
  });
}

/**
 * La route /<slug> reçoit TOUT ce que les robots devinent (wp-login.php,
 * apple-touch-icon.png, .env…). Un slug de fiche ne contient que lettres,
 * chiffres, tirets et underscores : le reste est refusé sans interroger la
 * base (une requête Supabase évitée par faux chemin).
 */
export function isPlausibleSlug(slug: string): boolean {
  return /^[A-Za-z0-9_-]{1,200}$/.test(slug);
}

/**
 * Catégories du menu et du pied de page. Si la base est injoignable (et qu'aucune
 * valeur n'est en mémoire), le menu s'affiche sans catégories au lieu de faire
 * tomber toute la page en erreur 500.
 */
export async function getNavCategories(market: Market): Promise<Category[]> {
  try {
    return await getActiveCategories(market);
  } catch (e) {
    console.error('[menu] catégories indisponibles :', e);
    return [];
  }
}
