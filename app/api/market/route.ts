import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { isValidMarket } from '@/lib/market';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, dbErrorResponse, readJsonObject, unauthorized } from '../_lib/http';
import { pickMarketProductFields } from '../_lib/market-input';

// Avant : GET et POST étaient ouverts à tous — n'importe qui pouvait lire l'étude de marché
// ET y insérer des lignes. Réservé à l'admin.
export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) return unauthorized();

  const category = request.nextUrl.searchParams.get('category');
  const market = getActiveMarket();

  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin
    .from('market_products')
    .select('*')
    .eq('market', market)
    .order('trend_score', { ascending: false })
    .order('confidence_score', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query.limit(200);
  if (error) {
    console.error('[api] GET /api/market :', error.message);
    return NextResponse.json([], { status: 500 });
  }
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedRequest(request)) return unauthorized();
  const supabaseAdmin = getSupabaseAdmin();
  const parsed = await readJsonObject(request);
  if ('response' in parsed) return parsed.response;
  const body = parsed.body;
  if (body.market !== undefined && body.market !== null && body.market !== '' && !isValidMarket(body.market as string)) {
    return badRequest('Marché invalide (fr, es ou uk)');
  }
  const market = isValidMarket(body.market as string) ? (body.market as 'fr' | 'es' | 'uk') : getActiveMarket();

  // Champs connus uniquement (avant : le corps entier était inséré tel quel).
  const fields = pickMarketProductFields(body, 'create');
  if ('error' in fields) return badRequest(fields.error);

  const { data, error } = await supabaseAdmin
    .from('market_products')
    .insert({ ...fields.data, market })
    .select()
    .single();

  if (error) return dbErrorResponse('POST /api/market', error);
  return NextResponse.json(data);
}
