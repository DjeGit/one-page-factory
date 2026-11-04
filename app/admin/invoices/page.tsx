import InvoicesManager from '@/components/admin/InvoicesManager';
import { withAdminAuth } from '@/app/admin/admin-guard';

export const dynamic = 'force-dynamic';

export default withAdminAuth(function InvoicesPage() {
  return <InvoicesManager />;
});
