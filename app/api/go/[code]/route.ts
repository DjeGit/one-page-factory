import { NextRequest, NextResponse } from 'next/server';
import { getProductByCode, trackClick, getSupabaseAdmin } from '@/lib/supabase';
import { createHash } from 'crypto';
import { isValidMarket, DEFAULT_MARKET } from '@/lib/market';
import { MARKET_ORIGIN, getRequestHost, getRequestOrigin, isTendpickHost } from '@/lib/site-url';
import { isHttpUrl } from '../../_lib/http';
import { trackAbClick } from '../../_lib/ab-test';

// Même calcul que lib/supabase.ts (trackClick) : le hash doit être identique pour que le
// comptage anti-fraude retrouve les clics déjà enregistrés pour cette IP.
function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.ADMIN_SECRET || 'salt')).digest('hex').slice(0, 16);
}

function getIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() || null : null;
}

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
};

const CODE_RE = /^[A-Za-z0-9_-]{4,64}$/;
const MAX_CLICKS_PER_HOUR_PER_IP = 20;

type ProductRow = Record<string, unknown>;

/** Adresse de redirection : colonne propre au marché, puis lien de la fiche (une fiche = un marché), puis ancien champ FR. */
function pickAffiliateUrl(product: ProductRow, market: string): string | null {
  const candidates = [
    market === 'es' ? product.affiliate_url_es : null,
    market === 'uk' ? product.affiliate_url_com : null,
    product.affiliate_url,
    product.affiliate_url_fr,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && isHttpUrl(c.trim())) return c.trim();
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  // Retour à l'accueil du domaine VISITÉ (tendpick.fr reste sur .fr) — avant, NEXT_PUBLIC_SITE_URL
  // envoyait les visiteurs d'un marché vers le domaine d'un autre.
  const home = () => NextResponse.redirect(new URL('/', getRequestOrigin(req.headers)), { status: 302, headers: NO_STORE });

  if (!CODE_RE.test(params.code)) return home();

  try {
    const product = (await getProductByCode(params.code)) as ProductRow | null;
    if (!product) return home();

    const rawMarket = typeof product.market === 'string' ? product.market : null;
    const productMarket = isValidMarket(rawMarket) ? rawMarket : DEFAULT_MARKET;
    // Page de la fiche sur le domaine de SON marché (en local / test : domaine de la requête).
    const productBase = isTendpickHost(getRequestHost(req.headers)) ? MARKET_ORIGIN[productMarket] : getRequestOrigin(req.headers);
    const productPage = () =>
      NextResponse.redirect(new URL(`/${encodeURIComponent(String(product.slug ?? ''))}`, productBase), { status: 302, headers: NO_STORE });

    // Détection de fraude : trop de clics depuis la même IP en 60 minutes. Sans IP identifiable on
    // ne contrôle rien (sinon tous les visiteurs « sans IP » seraient regroupés et renvoyés vers la
    // page produit au lieu du lien affilié). Une panne de base ne doit jamais empêcher la redirection.
    const ip = getIp(req);
    if (ip) {
      try {
        const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: recentClickCount } = await getSupabaseAdmin()
          .from('clicks')
          .select('*', { count: 'exact', head: true })
          .eq('ip_hash', hashIp(ip))
          .gte('clicked_at', sixtyMinutesAgo);
        if ((recentClickCount || 0) > MAX_CLICKS_PER_HOUR_PER_IP) return productPage();
      } catch (err) {
        console.error('GET /api/go/[code] contrôle anti-fraude indisponible :', err);
      }
    }

    // Enregistrement du clic en tâche de fond (ne retarde pas la redirection).
    const productId = String(product.id);
    trackClick(productId, req).catch(console.error);
    trackAbClick(getSupabaseAdmin(), productId, (name) => req.cookies.get(name)?.value).catch(console.error);

    // product.market est le marché RÉEL du produit cliqué (pas un cookie visiteur, illisible dans
    // la requête qui le pose). Les colonnes affiliate_url_es/com ne sont pas encore renseignées :
    // le lien de la fiche (affiliate_url) fait foi, puis l'ancien champ FR.
    const affiliateUrl = pickAffiliateUrl(product, productMarket);
    // Fiche sans lien exploitable : le visiteur reste sur la page produit plutôt que d'atterrir sur "/".
    if (!affiliateUrl) return productPage();

    return NextResponse.redirect(affiliateUrl, { status: 302, headers: NO_STORE });
  } catch (error) {
    console.error('GET /api/go/[code] error:', error);
    return home();
  }
}
