import SocialPageClient from '@/components/admin/social/SocialPageClient';
import { withAdminAuth } from '@/app/admin/admin-guard';

export const dynamic = 'force-dynamic';

// Page serveur minimale : elle porte la garde d'authentification, le contenu interactif
// vit dans le composant client (rien n'est chargé ni exécuté si on n'est pas connecté).
export default withAdminAuth(function SocialPage() {
  return <SocialPageClient />;
});
