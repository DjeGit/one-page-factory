import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';

// GET /api/leads/export?product_id=xxx -> returns CSV
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('product_id');
  const sb = getSupabaseAdmin();
  const market = getActiveMarket();
  let query = sb.from('email_leads').select('email, source_slug, created_at').eq('market', market);
  if (productId) query = query.eq('product_id', productId);
  const { data } = await query.order('created_at', { ascending: false });

  const csv = ['email,source,date', ...(data || []).map(r => `${r.email},${r.source_slug},${new Date(r.created_at).toLocaleDateString('fr-FR')}`)].join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="leads.csv"' } });
}
