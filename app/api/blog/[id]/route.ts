import { NextRequest, NextResponse } from 'next/server';
import { getBlogPostByIdAdmin, updateBlogPost, deleteBlogPost, publishBlogPost, unpublishBlogPost } from '@/lib/blog';
import { clearTtlCache } from '@/lib/ttl-cache';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, dbErrorResponse, invalidId, isUuid, notFound, readJsonObject, unauthorized } from '../../_lib/http';
import { parseBlogForm } from '../../_lib/blog-input';

interface Params {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();
  const post = await getBlogPostByIdAdmin(params.id);
  if (!post) return notFound('Article introuvable');
  return NextResponse.json(post);
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();
  try {
    const parsed = await readJsonObject(req);
    if ('response' in parsed) return parsed.response;
    const body = parsed.body;

    // Publication explicite demandée depuis l'admin (ex: bouton "Publier"
    // sans repasser par tout le formulaire) : { publish: true } seul.
    if (body.publish === true && Object.keys(body).length === 1) {
      const { post, error } = await publishBlogPost(params.id);
      if (!post) return dbErrorResponse('PUT /api/blog/[id] (publication)', error || 'publication impossible', 'Erreur lors de la publication');
      clearTtlCache();
      return NextResponse.json(post);
    }

    // Repasser en brouillon depuis la liste : { unpublish: true } seul.
    if (body.unpublish === true && Object.keys(body).length === 1) {
      const { post, error } = await unpublishBlogPost(params.id);
      if (!post) return dbErrorResponse('PUT /api/blog/[id] (brouillon)', error || 'dépublication impossible', 'Erreur lors du passage en brouillon');
      clearTtlCache();
      return NextResponse.json(post);
    }

    const result = parseBlogForm(body);
    if ('error' in result) return badRequest(result.error);

    const { post, error } = await updateBlogPost(params.id, result.form);
    if (!post) return dbErrorResponse('PUT /api/blog/[id]', error || 'mise à jour impossible', 'Erreur lors de la mise à jour');

    clearTtlCache();
    return NextResponse.json(post);
  } catch (error) {
    console.error(`PUT /api/blog/${params.id} error:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  if (!isUuid(params.id)) return invalidId();
  const { error } = await deleteBlogPost(params.id);
  if (error) return dbErrorResponse('DELETE /api/blog/[id]', error);
  clearTtlCache();
  return NextResponse.json({ ok: true });
}
