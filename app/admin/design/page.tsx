import { getAllProducts } from '@/lib/supabase';
import DesignStudio from '@/components/admin/design/DesignStudio';
import { getActiveMarket } from '@/lib/get-active-market';
import { withAdminAuth } from '@/app/admin/admin-guard';

export const dynamic = 'force-dynamic';

export default withAdminAuth(async function DesignPage() {
  const market = getActiveMarket();
  const products = await getAllProducts(market);

  return (
    <DesignStudio key={market} products={products} />
  );
});
