import { NextRequest, NextResponse } from 'next/server';
import { updateCategory, deleteCategory, getSupabaseAdmin } from '@/lib/supabase';
import { clearTtlCache } from '@/lib/ttl-cache';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, dbErrorResponse, invalidId, isUuid, notFound, readJsonObject, unauthorized } from '../../_lib/http';
import { parseCategoryNames, parseSortOrder } from '../../_lib/blog-input';
import type { Category } from '@/types';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();
  try {
    const parsed = await readJsonObject(req);
    if ('response' in parsed) return parsed.response;
    const body = parsed.body;

    // Mise à jour partielle : on ne touche que les champs réellement présents dans la requête.
    //
    // La visibilité d'une catégorie n'est plus réglable à la main : elle est AUTOMATIQUE (une catégorie
    // s'affiche sur un marché dès qu'elle y contient un produit en ligne, lib/category-visibility.ts).
    // Les anciens interrupteurs `is_active` et `market_active` (activation par marché) ne sont donc
    // plus acceptés ici — plus aucun écran ne les envoie, et les accepter laissait croire qu'ils
    // agissaient encore sur le site.
    const names = parseCategoryNames(body, true);
    if ('error' in names) return badRequest(names.error);
    const update: Partial<Category> = { ...names.data };
    if ('sort_order' in body) {
      const sortOrder = parseSortOrder(body.sort_order);
      if (sortOrder === null) return badRequest("Ordre d'affichage invalide (entier entre 0 et 9999)");
      if (sortOrder !== undefined) update.sort_order = sortOrder;
    }
    if (Object.keys(update).length === 0) return badRequest('Aucune modification à enregistrer');

    if (update.slug) {
      const { data: taken } = await getSupabaseAdmin().from('categories').select('id').eq('slug', update.slug).neq('id', params.id).maybeSingle();
      if (taken) return NextResponse.json({ error: 'Ce slug est déjà utilisé par une autre catégorie' }, { status: 409 });
    }

    const category = await updateCategory(params.id, update);
    if (!category) {
      // updateCategory ne distingue pas « introuvable » d'une erreur : on vérifie l'existence.
      const { data: exists } = await getSupabaseAdmin().from('categories').select('id').eq('id', params.id).maybeSingle();
      if (!exists) return notFound('Catégorie introuvable');
      return dbErrorResponse('PUT /api/categories/[id]', 'mise à jour impossible', 'Erreur lors de la mise à jour de la catégorie');
    }

    clearTtlCache();
    return NextResponse.json(category);
  } catch (error) {
    console.error('PUT /api/categories/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();
  try {
    const ok = await deleteCategory(params.id);
    if (!ok) {
      return dbErrorResponse('DELETE /api/categories/[id]', 'suppression impossible', 'Erreur lors de la suppression de la catégorie');
    }
    clearTtlCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/categories/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
