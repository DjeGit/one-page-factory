import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';
import LoginForm from './LoginForm';

function isAuthenticated(): boolean {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('admin_auth');
  const secret = process.env.ADMIN_SECRET || 'changeme';
  return authCookie?.value === secret;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <LoginForm />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
