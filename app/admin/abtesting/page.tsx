import ABTestingManager from '@/components/admin/ABTestingManager';
import { getAllProducts, getSupabaseAdmin } from '@/lib/supabase';
import type { ABTest } from '@/types';
import { getActiveMarket } from '@/lib/get-active-market';
import type { Market } from '@/lib/market';
import { withAdminAuth } from '@/app/admin/admin-guard';

export const dynamic = 'force-dynamic';

// Requête directe Supabase au lieu de l'API HTTP
// (évite le bug NEXT_PUBLIC_SITE_URL=tendpick.com qui faisait partir la requête vers le mauvais serveur)
async function getABTests(market: Market): Promise<ABTest[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('market', market)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as ABTest[];
  } catch {
    return [];
  }
}

export default withAdminAuth(async function ABTestingPage() {
  const market = getActiveMarket();
  const [tests, products] = await Promise.all([
    getABTests(market),
    getAllProducts(market),
  ]);

  // key={market} : changer de marché remonte le composant avec les tests du nouveau marché
  // (sinon il gardait en mémoire la liste du marché précédent). Produits allégés : seuls
  // les champs utiles au formulaire partent au navigateur.
  const slim = products.map((p) => ({ id: p.id, name: p.name, hero_title: p.hero_title, hero_subtitle: p.hero_subtitle }));
  return <ABTestingManager key={market} initialTests={tests} products={slim} />;
});
