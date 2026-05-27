import { getAllProducts } from '@/lib/supabase';
import DesignStudio from '@/components/admin/design/DesignStudio';

export const dynamic = 'force-dynamic';

export default async function DesignPage() {
  const products = await getAllProducts();

  return (
    <DesignStudio products={products} />
  );
}
