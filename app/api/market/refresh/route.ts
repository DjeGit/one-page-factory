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

// ─── Auth guard ────────────────────────────────────────────────────────────
// Double entrée : session admin (cookie, appel depuis le back-office) OU
// secret serveur-à-serveur (Bearer, appel cron 6h) — cf. lib/admin-auth.ts.
// Remplace un `isAuthorized()` local dupliqué qui comparait les secrets
// avec `===` (faille de timing, audit du 22/09) par la version centralisée,
// à comparaison en temps constant.

// GET = pré-check pour l'UI : quelles sources seraient interrogées si on
// lance un refresh maintenant (évite de lancer un refresh "à l'aveugle").
export async function GET() {
  const activeSources = await getActiveDataSources();
  return NextResponse.json({ activeSources });
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const market: Market = isValidMarket(body.market) ? body.market : getActiveMarket();
  const category: string | undefined = typeof body.category === 'string' ? body.category : undefined;

  const { signals, sourcesUsed, sourcesSkipped } = await refreshMarketFromActiveSources(market, category);

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

  const sb = getSupabaseAdmin();

  // Cohérence de niche (proxy grossier, cf. lib/market/scoring.ts) : nombre
  // de produits déjà actifs sur CE marché.
  const { count: existingCategoryCount } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('market', market)
    .eq('active', true);

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
      last_refreshed: new Date().toISOString(),
    };
  });

  // On ne supprime QUE les anciennes données de CE marché — bug corrigé
  // par rapport à l'ancien code qui effaçait market_products en entier,
  // tous marchés confondus, à chaque refresh.
  await sb.from('market_products').delete().eq('market', market);

  if (rows.length > 0) {
    const { error } = await sb.from('market_products').insert(rows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    market,
    count: rows.length,
    sourcesUsed,
    sourcesSkipped,
    refreshed_at: new Date().toISOString(),
  });
}
