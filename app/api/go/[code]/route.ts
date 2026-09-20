import { NextRequest, NextResponse } from 'next/server';
import { getProductByCode, trackClick, getSupabaseAdmin } from '@/lib/supabase';
import { createHash } from 'crypto';
import { isValidMarket, DEFAULT_MARKET } from '@/lib/market';

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

    // Clean 302 redirect to the product's affiliate URL. Les colonnes
    // affiliate_url_fr/es/com existent dans le schéma (chantier multi-marché
    // antérieur, 'com' = suffixe DB historique du marché anglophone 'uk')
    // mais ne sont pas encore renseignées — on reste sur affiliate_url tant
    // qu'elles ne le sont pas, avec fallback naturel.
    //
    // Audit 21/09 (bug HIGH corrigé) : utilisait avant le cookie visiteur
    // opf_market, illisible dans la même requête qui vient de le poser —
    // en pratique un fallback silencieux sur l'URL FR pour toute
    // redirection qui suit une première visite. product.market est la
    // source fiable : c'est le marché RÉEL du produit cliqué, disponible
    // immédiatement, sans dépendre d'un cookie déjà posé par ailleurs.
    const productMarket = isValidMarket((product as any).market)
      ? (product as any).market
      : DEFAULT_MARKET;
    const affiliateUrl =
      (productMarket === 'es' ? (product as any).affiliate_url_es : null) ??
      (productMarket === 'uk' ? (product as any).affiliate_url_com : null) ??
      (product as any).affiliate_url_fr ??
      product.affiliate_url ??
      '/';
    return NextResponse.redirect(affiliateUrl, {
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
