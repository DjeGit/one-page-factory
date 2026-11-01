import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { toTrendCsv, type TrendCandidate } from '@/lib/trends';

export const dynamic = 'force-dynamic';

/** GET ?week=AAAA-MM-JJ : export CSV (ouvrable dans Excel) de la semaine, avec la colonne OUI/NON. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabaseAdmin();
  let week = req.nextUrl.searchParams.get('week');
  if (!week) {
    const { data } = await sb.from('trend_candidates').select('week').order('week', { ascending: false }).limit(1);
    week = data?.[0]?.week ?? null;
  }
  if (!week) return NextResponse.json({ error: 'Aucune donnée' }, { status: 404 });
  const { data, error } = await sb.from('trend_candidates').select('*').eq('week', week)
    .order('category_slug').order('sales', { ascending: false, nullsFirst: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(toTrendCsv((data ?? []) as TrendCandidate[]), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tendance-semaine-${week}.csv"`,
    },
  });
}
