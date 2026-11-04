import { NextRequest, NextResponse } from 'next/server';
import { updateBlogCategory, deleteBlogCategory } from '@/lib/blog';
import { clearTtlCache } from '@/lib/ttl-cache';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, dbErrorResponse, invalidId, isUuid, readJsonObject, unauthorized } from '../../_lib/http';
import { parseCategoryNames, parseColor, parseSortOrder } from '../../_lib/blog-input';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();
  try {
    const parsed = await readJsonObject(req);
    if ('response' in parsed) return parsed.response;
    const body = parsed.body;

    // Le formulaire renvoie toujours l'ensemble des champs (le lib écrase la ligne entière).
    const names = parseCategoryNames(body, false);
    if ('error' in names) return badRequest(names.error);
    const color = parseColor(body.color);
    if (color === undefined) return badRequest('Couleur invalide');
    const sortOrder = parseSortOrder(body.sort_order);
    if (sortOrder === null) return badRequest("Ordre d'affichage invalide (entier entre 0 et 9999)");

    const d = names.data;
    const { category, error } = await updateBlogCategory(params.id, {
      slug: d.slug!,
      name_fr: d.name_fr!,
      name_es: d.name_es!,
      name_uk: d.name_uk!,
      icon: d.icon ?? null,
      color,
      sort_order: sortOrder ?? 0,
    });

    if (!category) return dbErrorResponse('PUT /api/blog-categories/[id]', error || 'mise à jour impossible', 'Erreur lors de la mise à jour de la catégorie');

    clearTtlCache();
    return NextResponse.json(category);
  } catch (error) {
    console.error('PUT /api/blog-categories/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();
  try {
    const { error } = await deleteBlogCategory(params.id);
    if (error) return dbErrorResponse('DELETE /api/blog-categories/[id]', error, 'Erreur lors de la suppression de la catégorie');
    clearTtlCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/blog-categories/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
