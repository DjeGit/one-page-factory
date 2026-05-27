import { NextRequest, NextResponse } from 'next/server';
import { getProductByCode, trackClick, getSupabaseAdmin } from '@/lib/supabase';
import { createHash } from 'crypto';

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.ADMIN_SECRET || 'salt')).digest('hex').slice(0, 16);
}

function getIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const product = await getProductByCode(params.code);

    if (!product) {
      // Redirect to homepage if code not found
      return NextResponse.redirect(
        new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
        { status: 302 }
      );
    }

    // Fraud detection: count clicks from same IP in last 60 minutes
    const ip = getIp(req);
    const ipHash = hashIp(ip);
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const sb = getSupabaseAdmin();
    const { count: recentClickCount } = await sb
      .from('clicks')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('clicked_at', sixtyMinutesAgo);

    if ((recentClickCount || 0) > 20) {
      // Suspected click fraud: redirect to product page instead of affiliate URL
      const productPageUrl = new URL(
        `/${product.slug}`,
        process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      );
      return NextResponse.redirect(productPageUrl.toString(), {
        status: 302,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
    }

    // Track the click asynchronously (don't await to keep response fast)
    trackClick(product.id, req).catch(console.error);

    // Clean 302 redirect to affiliate URL
    return NextResponse.redirect(product.affiliate_url, {
      status: 302,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('GET /api/go/[code] error:', error);
    return NextResponse.redirect(
      new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
      { status: 302 }
    );
  }
}
