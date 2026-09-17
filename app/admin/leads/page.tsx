import LeadsManager from '@/components/admin/LeadsManager';
import { getAllProducts } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const products = await getAllProducts(getActiveMarket());
  return <LeadsManager products={products} />;
}
