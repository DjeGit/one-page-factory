import LeadsManager from '@/components/admin/LeadsManager';
import { getAllProducts } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { withAdminAuth } from '@/app/admin/admin-guard';

export const dynamic = 'force-dynamic';

export default withAdminAuth(async function LeadsPage() {
  const market = getActiveMarket();
  const products = await getAllProducts(market);
  // Produits allégés (identifiant et nom suffisent à l'écran) ; key : repart à neuf quand le marché change.
  return <LeadsManager key={market} products={products.map((p) => ({ id: p.id, name: p.name }))} />;
});
