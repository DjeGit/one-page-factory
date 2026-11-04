import { NextRequest, NextResponse } from 'next/server';
import { getCategories, createCategory, getSupabaseAdmin } from '@/lib/supabase';
import { clearTtlCache } from '@/lib/ttl-cache';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, dbErrorResponse, readJsonObject, unauthorized } from '../_lib/http';
import { parseCategoryNames, parseSortOrder } from '../_lib/blog-input';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  try {
    const parsed = await readJsonObject(req);
    if ('response' in parsed) return parsed.response;
    const body = parsed.body;

    const names = parseCategoryNames(body, false);
    if ('error' in names) return badRequest(names.error);
    const sortOrder = parseSortOrder(body.sort_order);
    if (sortOrder === null) return badRequest("Ordre d'affichage invalide (entier entre 0 et 9999)");

    // Un slug déjà pris est signalé clairement (avant : « Erreur lors de la création » sans explication).
    const d = names.data;
    const { data: taken } = await getSupabaseAdmin().from('categories').select('id').eq('slug', d.slug!).maybeSingle();
    if (taken) return NextResponse.json({ error: 'Ce slug est déjà utilisé par une autre catégorie' }, { status: 409 });

    const category = await createCategory({
      slug: d.slug!,
      name_fr: d.name_fr!,
      name_es: d.name_es!,
      name_uk: d.name_uk!,
      icon: d.icon ?? null,
      sort_order: sortOrder ?? 0,
    });

    if (!category) {
      return dbErrorResponse('POST /api/categories', 'création impossible', 'Erreur lors de la création de la catégorie');
    }

    // La catégorie n'apparaît sur le site qu'à partir du premier produit en ligne dedans (lib/category-visibility.ts).
    clearTtlCache();
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
