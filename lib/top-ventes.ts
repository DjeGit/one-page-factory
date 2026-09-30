// Top Ventes = filtre transverse calcule depuis le domaine du lien
// affilie (pas une categorie stockee en DB) -- decision Jerome 28/09 pour
// eviter toute migration/reassignation des produits existants.
export type TopVentesSource = 'amazon' | 'rakuten' | 'aliexpress';

export const TOP_VENTES_SOURCES: { key: TopVentesSource; label: string; icon: string }[] = [
  { key: 'amazon', label: 'Amazon', icon: '\ud83d\udce6' },
  { key: 'rakuten', label: 'Rakuten', icon: '\ud83d\udecd\ufe0f' },
  { key: 'aliexpress', label: 'AliExpress', icon: '\ud83c\udf0f' },
];

export function getProductSource(affiliateUrl: string | null | undefined): TopVentesSource | null {
  if (!affiliateUrl) return null;
  const url = affiliateUrl.toLowerCase();
  if (url.includes('amazon.')) return 'amazon';
  if (url.includes('rakuten.')) return 'rakuten';
  if (url.includes('aliexpress.')) return 'aliexpress';
  return null;
}
