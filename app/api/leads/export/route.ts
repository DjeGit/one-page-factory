import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, dbErrorResponse, isUuid, unauthorized } from '../../_lib/http';

const PAGE = 1000;
const MAX_ROWS = 50000;

/** Cellule CSV : guillemets doublés, et neutralisation des formules (=, +, -, @) que le tableur exécuterait. */
function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/leads/export?product_id=xxx -> returns CSV
// Avant : route SANS authentification — n'importe qui connaissant l'adresse téléchargeait la liste
// complète des e-mails collectés (donnée personnelle, RGPD). Réservée à l'admin désormais.
export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();

  const productId = req.nextUrl.searchParams.get('product_id');
  if (productId && !isUuid(productId)) return badRequest('product_id invalide');
  const sb = getSupabaseAdmin();
  const market = getActiveMarket();

  // Lecture par pages de 1000 : Supabase tronque sinon l'export en silence.
  const rows: { email: string | null; source_slug: string | null; created_at: string }[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let query = sb.from('email_leads').select('email, source_slug, created_at').eq('market', market);
    if (productId) query = query.eq('product_id', productId);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return dbErrorResponse('GET /api/leads/export', error);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  const lines = ['email,source,date', ...rows.map((r) => [r.email, r.source_slug, new Date(r.created_at).toLocaleDateString('fr-FR')].map(csvCell).join(','))];
  return new NextResponse('﻿' + lines.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leads.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
