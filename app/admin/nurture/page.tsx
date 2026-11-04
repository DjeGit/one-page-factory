import NurtureEnrollPanel from '@/components/admin/leads/NurtureEnrollPanel';
import { getSupabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/app/admin/admin-guard';

export const dynamic = 'force-dynamic';

// Pas de scoping par marché actif ici (contrairement à /admin/leads) : le
// panneau doit pouvoir filtrer/afficher des produits des 3 marchés à la
// fois, l'utilisateur choisit le marché dans le formulaire lui-même.
export default withAdminAuth(async function NurturePage() {
  const { data } = await getSupabaseAdmin().from('products').select('id, name, market').order('name');
  const products = (data ?? []) as { id: string; name: string; market: string }[];
  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <h1 className="text-2xl font-black text-gray-900 mb-1">Relance email</h1>
      <p className="text-gray-500 mb-6">Inscrire des leads existants dans une séquence de relance Brevo.</p>
      <NurtureEnrollPanel products={products} />
    </div>
  );
});
