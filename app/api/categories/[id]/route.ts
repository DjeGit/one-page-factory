import { NextRequest, NextResponse } from 'next/server';
import { updateCategory, deleteCategory } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();

    const category = await updateCategory(params.id, {
      slug: body.slug,
      name_fr: body.name_fr,
      name_es: body.name_es,
      name_uk: body.name_uk,
      icon: body.icon ?? null,
      sort_order: body.sort_order,
    });

    if (!category) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour de la catégorie' }, { status: 500 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('PUT /api/categories/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const ok = await deleteCategory(params.id);
    if (!ok) {
      return NextResponse.json({ error: 'Erreur lors de la suppression de la catégorie' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/categories/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
