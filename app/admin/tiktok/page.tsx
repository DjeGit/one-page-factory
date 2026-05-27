import TikTokHub from '@/components/admin/TikTokHub';
import { getAllProducts } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function TikTokPage() {
  const products = await getAllProducts();
  return <TikTokHub products={products} />;
}
