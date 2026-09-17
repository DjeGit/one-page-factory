import ABTestingManager from '@/components/admin/ABTestingManager';
import { getAllProducts, getSupabaseAdmin } from '@/lib/supabase';
import type { ABTest } from '@/types';

export const dynamic = 'force-dynamic';

// Requête directe Supabase au lieu de l'API HTTP
// (évite le bug NEXT_PUBLIC_SITE_URL=tendpick.com qui faisait partir la requête vers le mauvais serveur)
async function getABTests(): Promise<ABTest[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('ab_tests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as ABTest[];
  } catch {
    return [];
  }
}

export default async function ABTestingPage() {
  const [tests, products] = await Promise.all([
    getABTests(),
    getAllProducts(),
  ]);

  return <ABTestingManager initialTests={tests} products={products} />;
}
