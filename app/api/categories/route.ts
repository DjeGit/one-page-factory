import { NextRequest, NextResponse } from 'next/server';
import { getCategories, createCategory } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();

    if (!body.slug || !body.name_fr || !body.name_es || !body.name_uk) {
      return NextResponse.json(
        { error: 'Le slug et les noms (fr/es/uk) sont requis' },
        { status: 400 }
      );
    }

    const category = await createCategory({
      slug: body.slug,
      name_fr: body.name_fr,
      name_es: body.name_es,
      name_uk: body.name_uk,
      icon: body.icon || null,
      sort_order: body.sort_order ?? 0,
    });

    if (!category) {
      return NextResponse.json({ error: 'Erreur lors de la création de la catégorie' }, { status: 500 });
    }

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
