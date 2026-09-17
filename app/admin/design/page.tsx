import { getAllProducts } from '@/lib/supabase';
import DesignStudio from '@/components/admin/design/DesignStudio';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function DesignPage() {
  const market = cookies().get('opf_market')?.value ?? 'fr';
  const products = await getAllProducts(market);

  return (
    <DesignStudio products={products} />
  );
}
