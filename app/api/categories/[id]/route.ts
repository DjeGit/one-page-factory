import { NextRequest, NextResponse } from 'next/server';
import { updateCategory, deleteCategory, setCategoryMarketActive } from '@/lib/supabase';
import { isValidMarket } from '@/lib/market';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import type { Category } from '@/types';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();

    // Mise à jour partielle (05/10, fix) : le bouton Actif/Masqué de
    // CategoriesManager.tsx n'envoie QUE { is_active }. Avant ce correctif,
    // les autres champs (slug/name_*/sort_order non envoyés -> undefined,
    // mais `icon: body.icon ?? null` forçait explicitement icon à null)
    // étaient écrasés à chaque bascule Actif/Masqué. On ne touche
    // désormais que les champs réellement présents dans la requête.
    const update: Partial<Category> = {};
    if (body.slug !== undefined) update.slug = body.slug;
    if (body.name_fr !== undefined) update.name_fr = body.name_fr;
    if (body.name_es !== undefined) update.name_es = body.name_es;
    if (body.name_uk !== undefined) update.name_uk = body.name_uk;
    if (body.icon !== undefined) update.icon = body.icon ?? null;
    if (body.sort_order !== undefined) update.sort_order = body.sort_order;
    if (body.is_active !== undefined) update.is_active = body.is_active;

    // Activation par marché (18/10) : { market: 'es', market_active: true }.
    if (body.market_active !== undefined) {
      if (!isValidMarket(body.market)) {
        return NextResponse.json({ error: 'Marché invalide' }, { status: 400 });
      }
      const toggled = await setCategoryMarketActive(params.id, body.market, !!body.market_active);
      if (!toggled) {
        return NextResponse.json(
          { error: 'Mise à jour impossible (migration 20261018000001 appliquée dans Supabase ?)' },
          { status: 500 }
        );
      }
      return NextResponse.json(toggled);
    }

    const category = await updateCategory(params.id, update);

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
