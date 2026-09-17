import { getAllProducts } from '@/lib/supabase';
import DesignStudio from '@/components/admin/design/DesignStudio';
import { getActiveMarket } from '@/lib/get-active-market';

export const dynamic = 'force-dynamic';

export default async function DesignPage() {
  const market = getActiveMarket();
  const products = await getAllProducts(market);

  return (
    <DesignStudio products={products} />
  );
}
