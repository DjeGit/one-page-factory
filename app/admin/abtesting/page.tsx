import ABTestingManager from '@/components/admin/ABTestingManager';
import { getAllProducts } from '@/lib/supabase';
import type { ABTest } from '@/types';

export const dynamic = 'force-dynamic';

async function getABTests(): Promise<ABTest[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/ab-test`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    return res.json();
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
