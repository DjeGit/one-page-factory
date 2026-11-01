import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Une fiche produit = une ligne par marché (fr / es / uk), reliées par source_product_ref :
 * la ligne « racine » (souvent la FR) a source_product_ref NULL, les autres pointent vers son id.
 * Quand Jerome active ou désactive un produit sur un marché, les autres marchés suivent.
 * Un marché où le produit n'existe pas n'a simplement aucune ligne : rien ne s'y affiche.
 */

export interface SyncProduct {
  id: string;
  slug: string;
  market: string;
  active: boolean;
  affiliate_url: string | null;
  image_url: string | null;
  images: string[] | null;
  source_product_ref: string | null;
}

export interface SyncResult {
  activated: { id: string; market: string; slug: string }[];
  deactivated: { id: string; market: string; slug: string }[];
  skipped: { id: string; market: string; slug: string; reasons: string[] }[];
}

/** Lien AliExpress « neutre » (page produit) : ce n'est pas un lien affilié. */
export function isNeutralAliexpressUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url.trim());
    return /(^|\.)aliexpress\.[a-z.]+$/i.test(u.hostname) && /^\/(item|i)\//.test(u.pathname);
  } catch {
    return false;
  }
}

/** Raisons pour lesquelles une fiche ne doit pas encore être mise en ligne ; liste vide = prête. */
export function publishIssues(p: Pick<SyncProduct, 'affiliate_url' | 'image_url' | 'images'>): string[] {
  const issues: string[] = [];
  if (!p.affiliate_url || !p.affiliate_url.trim()) issues.push('lien affilié manquant');
  else if (isNeutralAliexpressUrl(p.affiliate_url)) issues.push('lien affilié encore neutre (page AliExpress)');
  if (!(p.images && p.images.length > 0) && !p.image_url) issues.push('aucune photo');
  return issues;
}

const COLS = 'id, slug, market, active, affiliate_url, image_url, images, source_product_ref';

/** Les autres marchés du même produit (hors `product`). */
export async function getSiblings(product: Pick<SyncProduct, 'id' | 'source_product_ref'>): Promise<SyncProduct[]> {
  const supabase = getSupabaseAdmin();
  const rootId = product.source_product_ref || product.id;
  const { data, error } = await supabase
    .from('products')
    .select(COLS)
    .or(`id.eq.${rootId},source_product_ref.eq.${rootId}`);
  if (error || !data) {
    if (error) console.error('[market-sync] lecture des marchés liés :', error.message);
    return [];
  }
  return (data as SyncProduct[]).filter((p) => p.id !== product.id);
}

/**
 * Propage l'état actif/inactif d'un produit à ses autres marchés.
 * Désactiver : tous les marchés suivent. Activer : seuls les marchés prêts (lien affilié réel + photo) passent en ligne ;
 * les autres restent en brouillon et sont signalés dans `skipped` avec la raison.
 */
export async function syncActivation(product: Pick<SyncProduct, 'id' | 'source_product_ref'>, active: boolean): Promise<SyncResult> {
  const result: SyncResult = { activated: [], deactivated: [], skipped: [] };
  const siblings = await getSiblings(product);
  const supabase = getSupabaseAdmin();
  for (const s of siblings) {
    if (s.active === active) continue;
    if (active) {
      const issues = publishIssues(s);
      if (issues.length) {
        result.skipped.push({ id: s.id, market: s.market, slug: s.slug, reasons: issues });
        continue;
      }
    }
    const { error } = await supabase.from('products').update({ active }).eq('id', s.id);
    if (error) {
      result.skipped.push({ id: s.id, market: s.market, slug: s.slug, reasons: [`erreur : ${error.message}`] });
      continue;
    }
    (active ? result.activated : result.deactivated).push({ id: s.id, market: s.market, slug: s.slug });
  }
  return result;
}
