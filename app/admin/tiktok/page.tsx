import TikTokHub from '@/components/admin/TikTokHub';
import { getAllProducts } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { withAdminAuth } from '@/app/admin/admin-guard';

export const dynamic = 'force-dynamic';

export default withAdminAuth(async function TikTokPage() {
  const market = getActiveMarket();
  const products = await getAllProducts(market);
  return <TikTokHub key={market} products={products} />;
});
