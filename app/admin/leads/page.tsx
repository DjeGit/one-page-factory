import LeadsManager from '@/components/admin/LeadsManager';
import { getAllProducts } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const products = await getAllProducts();
  return <LeadsManager products={products} />;
}
