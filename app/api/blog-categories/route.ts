import { NextRequest, NextResponse } from 'next/server';
import { getBlogCategories, createBlogCategory } from '@/lib/blog';
import { clearTtlCache } from '@/lib/ttl-cache';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, dbErrorResponse, readJsonObject, unauthorized } from '../_lib/http';
import { parseCategoryNames, parseColor, parseSortOrder } from '../_lib/blog-input';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  try {
    const categories = await getBlogCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('GET /api/blog-categories error:', error);
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
    const color = parseColor(body.color);
    if (color === undefined) return badRequest('Couleur invalide');
    const sortOrder = parseSortOrder(body.sort_order);
    if (sortOrder === null) return badRequest("Ordre d'affichage invalide (entier entre 0 et 9999)");

    const d = names.data;
    const { category, error } = await createBlogCategory({
      slug: d.slug!,
      name_fr: d.name_fr!,
      name_es: d.name_es!,
      name_uk: d.name_uk!,
      icon: d.icon ?? null,
      color,
      sort_order: sortOrder ?? 0,
    });

    if (!category) return dbErrorResponse('POST /api/blog-categories', error || 'création impossible', 'Erreur lors de la création de la catégorie');

    clearTtlCache();
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('POST /api/blog-categories error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
