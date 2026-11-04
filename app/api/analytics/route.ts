import { NextRequest, NextResponse } from 'next/server';
import { trackPageView, getAnalytics, getSupabaseAdmin } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, createRateLimiter, dbErrorResponse, getClientIp, isUuid, readJsonObject, unauthorized } from '../_lib/http';
import { incrementAbCounter, isAbVariant } from '../_lib/ab-test';

// Route publique d'enregistrement (vues, clics, test A/B). 120 événements par
// minute et par visiteur : très au-dessus d'un usage normal, assez bas pour
// empêcher de gonfler les statistiques en boucle.
const limiter = createRateLimiter(120, 60_000);

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    if (ip && !limiter.allow(ip)) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
    }

    const parsed = await readJsonObject(req);
    if ('response' in parsed) return parsed.response;
    const body = parsed.body;

    if (!body.productId || !body.type) {
      return badRequest('productId et type sont requis');
    }
    // Avant : un identifiant quelconque partait à la base, l'insertion échouait
    // sans bruit et la route répondait « success ».
    if (!isUuid(body.productId)) return badRequest('productId invalide');

    if (body.type === 'click') {
      // Le clic est enregistré UNE fois, côté serveur, par /api/go/[code] (que tous les boutons
      // d'achat suivent juste après cet appel). Avant, ce type l'enregistrait aussi : chaque clic
      // comptait double dans la table clicks (CTR, revenus estimés et règles d'auto-optimisation
      // faussés). L'appel reste accepté pour ne pas casser les pages déjà chargées.
    } else if (body.type === 'view') {
      await trackPageView(body.productId, req);
    } else if (body.type === 'ab_view') {
      // Émis par la page produit quand un test A/B est actif. Avant, ce type était refusé (400)
      // et aucune vue de variante n'était jamais comptée.
      if (!isUuid(body.testId) || !isAbVariant(body.variant)) return badRequest('testId ou variant invalide');
      const result = await incrementAbCounter(getSupabaseAdmin(), body.testId, body.variant, 'views');
      if (result === 'error') return dbErrorResponse('POST /api/analytics (ab_view)', 'incrément impossible');
    } else {
      return badRequest('Type invalide, doit être "click", "view" ou "ab_view"');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/analytics error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Statistiques détaillées par produit : réservées à l'admin (avant : lisibles par n'importe qui).
export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId') || undefined;
    if (productId && !isUuid(productId)) return badRequest('productId invalide');

    const analytics = await getAnalytics(getActiveMarket(), productId);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('GET /api/analytics error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
