/**
 * /api/market/refresh (Sprint 4 — réécriture complète)
 *
 * AVANT : demandait à GPT-4o-mini d'halluciner "les 20 produits qui se
 * vendent le mieux" sans aucune vraie source — jeté, pas patché (cf. plan).
 *
 * MAINTENANT : agrège les signaux de TOUTES les sources de données
 * activées pour le marché actif (lib/integrations/data-source-chain.ts,
 * Sprint 3), les score (lib/market/scoring.ts) et remplace les données de
 * CE marché dans market_products — chaque ligne reste traçable à une
 * vraie source (`source` = id d'intégration d'origine).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveMarket } from '@/lib/get-active-market';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isValidMarket, type Market } from '@/lib/market';
import { getActiveDataSources, refreshMarketFromActiveSources } from '@/lib/integrations/data-source-chain';
import { scoreSignal, trendScoreFromScore, confidenceScoreFromSignal } from '@/lib/market/scoring';
import { badRequest, dbErrorResponse, readOptionalJsonObject, unauthorized } from '../../_lib/http';

// ─── Auth guard ────────────────────────────────────────────────────────────
// Double entrée : session admin (cookie, appel depuis le back-office) OU
// secret serveur-à-serveur (Bearer, appel cron 6h) — cf. lib/admin-auth.ts.
// Remplace un `isAuthorized()` local dupliqué qui comparait les secrets
// avec `===` (faille de timing, audit du 22/09) par la version centralisée,
// à comparaison en temps constant.

// GET = pré-check pour l'UI : quelles sources seraient interrogées si on
// lance un refresh maintenant (évite de lancer un refresh "à l'aveugle").
export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const activeSources = await getActiveDataSources();
  return NextResponse.json({ activeSources });
}

const INSERT_CHUNK = 500;

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();

  const parsed = await readOptionalJsonObject(req);
  if ('response' in parsed) return parsed.response;
  const body = parsed.body;
  if (body.market !== undefined && body.market !== null && body.market !== '' && !isValidMarket(body.market as string)) {
    return badRequest('Marché invalide (fr, es ou uk)');
  }
  const market: Market = isValidMarket(body.market as string) ? (body.market as Market) : getActiveMarket();
  const category: string | undefined = typeof body.category === 'string' && body.category.trim() ? body.category.trim().slice(0, 100) : undefined;

  let result;
  try {
    result = await refreshMarketFromActiveSources(market, category);
  } catch (err) {
    return dbErrorResponse('POST /api/market/refresh (sources)', err, "Impossible d'interroger les sources de données.");
  }
  const { signals, sourcesUsed, sourcesSkipped } = result;

  if (sourcesUsed.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Aucune source de données active pour ce marché. Activez-en une dans Paramètres > Intégrations (chaque source reste désactivée tant que vous ne l'activez pas explicitement).",
        sourcesSkipped,
      },
      { status: 409 }
    );
  }

  // Les sources ont répondu mais ne renvoient aucun produit (panne, quota…) : on garde les données
  // actuelles. Avant, elles étaient effacées puis remplacées par RIEN et la route répondait « succès ».
  if (signals.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Les sources actives n'ont renvoyé aucun produit : les données précédentes sont conservées.",
        sourcesUsed,
        sourcesSkipped,
      },
      { status: 502 }
    );
  }

  const sb = getSupabaseAdmin();

  // Cohérence de niche (proxy grossier, cf. lib/market/scoring.ts) : nombre
  // de produits déjà actifs sur CE marché.
  const { count: existingCategoryCount } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('market', market)
    .eq('active', true);

  const refreshedAt = new Date().toISOString();
  const rows = signals.map((signal) => {
    const { score, breakdown } = scoreSignal(signal, { existingCategoryCount: existingCategoryCount ?? 0 });
    return {
      market,
      source: signal.source,
      category: signal.category || 'Non classé',
      name: signal.name.slice(0, 200),
      description: signal.description || '',
      price_min: signal.price ?? null,
      price_max: signal.price ?? null,
      price_avg: signal.price ?? null,
      best_offer: signal.source,
      best_offer_price: signal.price ?? null,
      platforms: [signal.source],
      confidence_score: confidenceScoreFromSignal(signal),
      trend_score: trendScoreFromScore(score),
      source_notes: `Score ${score}/100 — ${Object.entries(breakdown)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ')} · lien : ${signal.url}`,
      last_refreshed: refreshedAt,
    };
  });

  // INSERTION D'ABORD, suppression des anciennes lignes ensuite : si l'insertion échoue, les
  // données précédentes restent intactes (avant : tout était effacé avant d'insérer, une erreur
  // laissait le marché vide). On ne supprime QUE les anciennes données de CE marché (et, pour un
  // refresh ciblé sur une catégorie, uniquement les catégories rafraîchies).
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const { error } = await sb.from('market_products').insert(rows.slice(i, i + INSERT_CHUNK));
    if (error) {
      // Lignes déjà insérées pendant cet appel : retirées pour ne pas laisser un état à moitié rafraîchi.
      await sb.from('market_products').delete().eq('market', market).eq('last_refreshed', refreshedAt);
      return dbErrorResponse('POST /api/market/refresh (insertion)', error);
    }
  }

  let cleanup = sb.from('market_products').delete().eq('market', market).lt('last_refreshed', refreshedAt);
  if (category) cleanup = cleanup.in('category', Array.from(new Set(rows.map((r) => r.category))));
  const { error: cleanupError } = await cleanup;
  if (cleanupError) console.error('[api] POST /api/market/refresh (nettoyage) :', cleanupError.message);

  return NextResponse.json({
    success: true,
    market,
    count: rows.length,
    sourcesUsed,
    sourcesSkipped,
    refreshed_at: refreshedAt,
  });
}
