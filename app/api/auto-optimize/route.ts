/**
 * /api/auto-optimize
 *
 * Analyse les performances de tous les produits actifs et applique des règles
 * automatiques :
 *
 * PAUSE  → si views >= MIN_VIEWS et CTR < PAUSE_THRESHOLD (0.5%)
 * FLAG   → si views >= MIN_VIEWS et CTR >= SCALE_THRESHOLD (5%) → marquer pour vidéo premium
 *
 * POST body: { dry_run?: boolean, min_views?: number, pause_threshold?: number, scale_threshold?: number }
 * Auth: Bearer PIPELINE_SECRET (ou ADMIN_SECRET)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  const secret = process.env.PIPELINE_SECRET || process.env.ADMIN_SECRET || '';
  return token === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun: boolean = body.dry_run ?? false;
  const minViews: number = body.min_views ?? 500;
  const pauseThreshold: number = body.pause_threshold ?? 0.5;   // %
  const scaleThreshold: number = body.scale_threshold ?? 5.0;   // %

  const sb = getSupabaseAdmin();

  // Get all active products
  const { data: products } = await sb
    .from('products')
    .select('id, name, slug, active')
    .eq('active', true);

  if (!products?.length) {
    return NextResponse.json({ message: 'No active products', actions: [] });
  }

  const actions: Array<{
    product_id: string;
    name: string;
    slug: string;
    views: number;
    clicks: number;
    ctr: number;
    action: 'pause' | 'scale_flag' | 'ok';
    applied: boolean;
  }> = [];

  for (const p of products) {
    const [{ count: views }, { count: clicks }] = await Promise.all([
      sb.from('page_views').select('*', { count: 'exact', head: true }).eq('product_id', p.id),
      sb.from('clicks').select('*', { count: 'exact', head: true }).eq('product_id', p.id),
    ]);

    const v = views || 0;
    const c = clicks || 0;

    if (v < minViews) continue; // not enough data

    const ctr = v > 0 ? (c / v) * 100 : 0;

    if (ctr < pauseThreshold) {
      // Pause this product
      if (!dryRun) {
        await sb.from('products').update({ active: false }).eq('id', p.id);
      }
      actions.push({ product_id: p.id, name: p.name, slug: p.slug, views: v, clicks: c, ctr: Math.round(ctr * 100) / 100, action: 'pause', applied: !dryRun });
    } else if (ctr >= scaleThreshold) {
      // Flag for premium video — store in product metadata (use description suffix as marker)
      // In a real setup you'd trigger a video generation here
      actions.push({ product_id: p.id, name: p.name, slug: p.slug, views: v, clicks: c, ctr: Math.round(ctr * 100) / 100, action: 'scale_flag', applied: false });
    } else {
      actions.push({ product_id: p.id, name: p.name, slug: p.slug, views: v, clicks: c, ctr: Math.round(ctr * 100) / 100, action: 'ok', applied: false });
    }
  }

  const paused = actions.filter((a) => a.action === 'pause');
  const toScale = actions.filter((a) => a.action === 'scale_flag');
  const ok = actions.filter((a) => a.action === 'ok');

  return NextResponse.json({
    dry_run: dryRun,
    analyzed: actions.length,
    paused: paused.length,
    scale_flagged: toScale.length,
    ok: ok.length,
    rules: { min_views: minViews, pause_threshold: `${pauseThreshold}%`, scale_threshold: `${scaleThreshold}%` },
    details: {
      paused,
      scale_flagged: toScale,
    },
  });
}

// GET = stats overview without applying changes
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Reuse POST with dry_run
  const fakeReq = new NextRequest(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({ dry_run: true }),
  });
  return POST(fakeReq);
}
