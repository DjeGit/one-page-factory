import TikTokHub from '@/components/admin/TikTokHub';
import { getAllProducts } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';

export const dynamic = 'force-dynamic';

export default async function TikTokPage() {
  const products = await getAllProducts(getActiveMarket());
  return <TikTokHub products={products} />;
}
