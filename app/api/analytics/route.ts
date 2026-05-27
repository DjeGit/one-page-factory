import { NextRequest, NextResponse } from 'next/server';
import { trackClick, trackPageView, getAnalytics } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.productId || !body.type) {
      return NextResponse.json(
        { error: 'productId et type sont requis' },
        { status: 400 }
      );
    }

    if (body.type === 'click') {
      await trackClick(body.productId, req);
    } else if (body.type === 'view') {
      await trackPageView(body.productId, req);
    } else {
      return NextResponse.json(
        { error: 'Type invalide, doit être "click" ou "view"' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/analytics error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId') || undefined;

    const analytics = await getAnalytics(productId);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('GET /api/analytics error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
