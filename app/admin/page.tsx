import { getDashboardStats, getAllProducts } from '@/lib/supabase';
import StatsCard from '@/components/admin/StatsCard';
import TopProductsLive from '@/components/admin/TopProductsLive';
import DashboardClient from '@/components/admin/DashboardClient';
import Link from 'next/link';
import type { Product } from '@/types';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [stats, products, topProductsRes] = await Promise.all([
    getDashboardStats(),
    getAllProducts(),
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/top-products`, { cache: 'no-store' })
      .then(r => r.json())
      .catch(() => []),
  ]);

  const recentProducts: Product[] = products.slice(0, 5);

  return (
    <div className="p-8">
      {/* DashboardClient handles header with report button + recent products */}
      <DashboardClient products={recentProducts} />

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10 mt-8">
        <StatsCard
          title="Produits actifs"
          value={stats.active_products}
          subtitle={`${stats.total_products} au total`}
          color="primary"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <StatsCard
          title="Clics aujourd&apos;hui"
          value={stats.clicks_today}
          subtitle={`${stats.total_clicks} au total`}
          color="orange"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          }
        />
        <StatsCard
          title="Vues aujourd&apos;hui"
          value={stats.views_today}
          subtitle={`${stats.total_views} au total`}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />
        <StatsCard
          title="CTR global"
          value={
            stats.total_views > 0
              ? `${((stats.total_clicks / stats.total_views) * 100).toFixed(1)}%`
              : '—'
          }
          subtitle="Taux de clic moyen"
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      {/* Top 10 Live */}
      <TopProductsLive initialData={topProductsRes} />

      {/* Quick actions */}
      <div className="mt-6 flex gap-4">
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau produit
        </Link>
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Analytics
        </Link>
      </div>
    </div>
  );
}
