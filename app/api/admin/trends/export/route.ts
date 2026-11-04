import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { toTrendCsv, type TrendCandidate } from '@/lib/trends';
import { badRequest, dbErrorResponse, isIsoDate, unauthorized } from '../../../_lib/http';

export const dynamic = 'force-dynamic';

/** GET ?week=AAAA-MM-JJ : export CSV (ouvrable dans Excel) de la semaine, avec la colonne OUI/NON. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const sb = getSupabaseAdmin();
  let week = req.nextUrl.searchParams.get('week');
  // La semaine finit dans un nom de fichier (en-tête HTTP) : format strict exigé.
  if (week && !isIsoDate(week)) return badRequest('Semaine invalide (format AAAA-MM-JJ)');
  if (!week) {
    const { data, error } = await sb.from('trend_candidates').select('week').order('week', { ascending: false }).limit(1);
    if (error) return dbErrorResponse('GET /api/admin/trends/export (semaine)', error);
    week = data?.[0]?.week ?? null;
  }
  if (!week) return NextResponse.json({ error: 'Aucune donnée' }, { status: 404 });
  const { data, error } = await sb.from('trend_candidates').select('*').eq('week', week)
    .order('category_slug').order('sales', { ascending: false, nullsFirst: false });
  if (error) return dbErrorResponse('GET /api/admin/trends/export', error);
  return new NextResponse(toTrendCsv((data ?? []) as TrendCandidate[]), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tendance-semaine-${week}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
