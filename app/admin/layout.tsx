import type { Metadata } from 'next';
import { isAdminAuthenticated } from './admin-guard';
import { getActiveMarket } from '@/lib/get-active-market';
import { MarketProvider } from '@/lib/market-context';
import Sidebar from '@/components/admin/Sidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: {
    default: 'One Page Factory',
    template: '%s | One Page Factory',
  },
  description: 'Back-office One Page Factory — gestion multi-marché des pages de vente Tendpick.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isAdminAuthenticated()) {
    return <LoginForm />;
  }

  const activeMarket = getActiveMarket();

  return (
    <MarketProvider initialMarket={activeMarket}>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </MarketProvider>
  );
}
