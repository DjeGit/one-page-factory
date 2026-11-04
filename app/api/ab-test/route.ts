import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, dbErrorResponse, isUuid, readJsonObject, unauthorized } from '../_lib/http';
import { pickAbTestFields } from '../_lib/ab-test-input';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const sb = getSupabaseAdmin();
  const market = getActiveMarket();
  const { data, error } = await sb
    .from('ab_tests')
    .select('*, products(name, slug)')
    .eq('market', market)
    .order('created_at', { ascending: false });
  // Avant : l'erreur était ignorée et la liste vide renvoyée en 200 — l'écran
  // affichait « aucun test » alors que la base n'avait simplement pas répondu.
  if (error) return dbErrorResponse('GET /api/ab-test', error);
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const parsed = await readJsonObject(req);
  if ('response' in parsed) return parsed.response;

  if (!isUuid(parsed.body.product_id)) return badRequest('Un produit est requis pour créer un test');
  const fields = pickAbTestFields(parsed.body);
  if ('error' in fields) return badRequest(fields.error);

  const sb = getSupabaseAdmin();
  // Marché dénormalisé depuis le produit concerné (cf. Sprint 1) : un produit
  // introuvable est une erreur, plus un repli silencieux sur le marché actif.
  const { data: product, error: productError } = await sb
    .from('products')
    .select('market')
    .eq('id', parsed.body.product_id)
    .maybeSingle();
  if (productError) return dbErrorResponse('POST /api/ab-test (produit)', productError);
  if (!product) return badRequest('Produit introuvable');

  const { data, error } = await sb
    .from('ab_tests')
    .insert({ ...fields.data, product_id: parsed.body.product_id, market: product.market })
    .select()
    .single();
  if (error) return dbErrorResponse('POST /api/ab-test', error);
  return NextResponse.json(data);
}
