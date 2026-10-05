import { NextRequest, NextResponse } from 'next/server';
import { updateBlogCategory, deleteBlogCategory } from '@/lib/blog';
import { isAuthorizedRequest } from '@/lib/admin-auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();

    const { category, error } = await updateBlogCategory(params.id, {
      slug: body.slug,
      name_fr: body.name_fr,
      name_es: body.name_es,
      name_uk: body.name_uk,
      icon: body.icon ?? null,
      color: body.color ?? null,
      sort_order: body.sort_order ?? 0,
    });

    if (!category) {
      return NextResponse.json({ error: error || 'Erreur lors de la mise à jour de la catégorie' }, { status: 500 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('PUT /api/blog-categories/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { error } = await deleteBlogCategory(params.id);
    if (error) {
      return NextResponse.json({ error: error || 'Erreur lors de la suppression de la catégorie' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/blog-categories/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
