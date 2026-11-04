import TrendsManager from '@/components/admin/market/TrendsManager';
import { withAdminAuth } from '@/app/admin/admin-guard';

export const dynamic = 'force-dynamic';

export default withAdminAuth(function TrendsPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Tendance de la semaine</h1>
        <p className="text-gray-500 mt-1">
          Choisis OUI ou NON pour chaque produit. Les produits non choisis restent visibles jusqu&apos;à la prochaine
          recherche, puis sont supprimés. Les refusés sont archivés (jamais supprimés) et peuvent revenir.
        </p>
      </div>
      <TrendsManager />
    </div>
  );
});
