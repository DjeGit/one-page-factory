/**
 * /api/pipeline/run
 *
 * Orchestrateur principal — enchaîne automatiquement :
 *   1. Discover   → scrape Amazon, score, importe les nouveaux produits (en brouillon)
 *   2. Generate   → génère le contenu IA des produits « auto_discovered » sans contenu
 *   3. Activate   → met en ligne les produits « auto_discovered » dont le contenu est complet
 *   4. Optimize   → pause les produits sous-performants
 *
 * POST body: { steps?: string[], dry_run?: boolean, max_products?: number, market?: 'fr'|'es'|'uk' }
 *   steps: ["discover", "generate", "activate", "optimize"] (all by default)
 *   market: marché ciblé par l'étape discover (défaut 'fr' — le cron déclenche un run par marché, cf. pipeline-cron.sh)
 *
 * Auth: Bearer PIPELINE_SECRET (ou ADMIN_SECRET) ou cookie admin
 *
 * Garde-fous (avant : les étapes 2 et 3 touchaient TOUS les brouillons du site) :
 *  - génération et mise en ligne ne concernent que les fiches créées par la découverte automatique
 *    (product_source = 'auto_discovered') : les brouillons manuels et ceux du pipeline tendances
 *    (scripts/pipeline/worker.mjs, qui active lui-même après contrôle) ne sont jamais publiés ici ;
 *  - une fiche n'est mise en ligne que si elle a un vrai lien d'achat et une photo (publishIssues) ;
 *  - une fiche déjà jugée trop peu performante par l'étape 4 (assez de vues) n'est pas remise en ligne
 *    par l'étape 3 à l'exécution suivante (avant : elle oscillait en ligne / en pause à chaque run).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateProductContent } from '@/lib/ai';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { publishIssues } from '@/lib/market-sync';
import { countsByProduct } from '@/lib/analytics/counts';
import { clearTtlCache } from '@/lib/ttl-cache';
import { isValidMarket } from '@/lib/market';
import { badRequest, readOptionalJsonObject, unauthorized } from '../../_lib/http';
import { DEFAULT_THRESHOLD, marketFrom, runDiscover } from '../../_lib/pipeline-discover';
import { DEFAULT_MIN_VIEWS, runAutoOptimize } from '../../_lib/auto-optimize';

const ALL_STEPS = ['discover', 'generate', 'activate', 'optimize'] as const;
type Step = (typeof ALL_STEPS)[number];
const MAX_PRODUCTS_LIMIT = 20;

// ─── Step 2: Generate content for auto-discovered products without AI content ─

async function stepGenerate(maxProducts: number) {
  const sb = getSupabaseAdmin();

  // Products with no hero_title = no AI content yet
  const { data: products, error } = await sb
    .from('products')
    .select('id, name, description, price, market')
    .is('hero_title', null)
    .eq('active', false)
    .eq('product_source', 'auto_discovered')
    .limit(maxProducts);

  if (error) {
    console.error('[api] pipeline/run (génération, lecture) :', error.message);
    return { generated: 0, errors: 1, error: 'lecture des produits impossible' };
  }
  if (!products?.length) return { generated: 0, errors: 0 };

  let generated = 0;
  let errors = 0;

  for (const p of products) {
    try {
      const content = await generateProductContent(
        p.description || p.name,
        p.name,
        p.price,
        marketFrom(p.market)
      );

      const { error: updateError } = await sb
        .from('products')
        .update({
          hero_title: content.hero_title,
          hero_subtitle: content.hero_subtitle,
          pain_points: content.pain_points,
          benefits: content.benefits,
          faq: content.faq,
          tiktok_script: content.tiktok_script,
          testimonials: content.testimonials,
          meta_title: content.meta_title,
          meta_description: content.meta_description,
        })
        .eq('id', p.id);
      if (updateError) throw new Error(updateError.message);

      generated++;
    } catch (err) {
      console.error(`[api] pipeline/run (génération) ${p.name} :`, err instanceof Error ? err.message : err);
      errors++;
    }

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 12000));
  }

  return { generated, errors };
}

// ─── Step 3: Activate auto-discovered products with complete content ──────

async function stepActivate() {
  const sb = getSupabaseAdmin();

  const { data: products, error } = await sb
    .from('products')
    .select('id, affiliate_url, image_url, images')
    .eq('active', false)
    .eq('product_source', 'auto_discovered')
    .not('hero_title', 'is', null)
    .not('affiliate_url', 'is', null)
    .limit(200);

  if (error) {
    console.error('[api] pipeline/run (activation, lecture) :', error.message);
    return { activated: 0, error: 'lecture des produits impossible' };
  }
  if (!products?.length) return { activated: 0 };

  // Prêt à publier : vrai lien d'achat + au moins une photo.
  const ready = products.filter((p) => publishIssues({
    affiliate_url: p.affiliate_url as string | null,
    image_url: p.image_url as string | null,
    images: p.images as string[] | null,
  }).length === 0);
  const notReady = products.length - ready.length;
  if (!ready.length) return { activated: 0, not_ready: notReady };

  // Une fiche qui a déjà assez de vues a été jugée par l'étape « optimize » : on ne la remet pas en ligne.
  const countOne = (table: 'clicks' | 'page_views', id: string) =>
    sb.from(table).select('*', { count: 'exact', head: true }).eq('product_id', id);
  const views = await countsByProduct(countOne, 'page_views', ready.map((p) => p.id as string));
  const ids = ready.filter((p) => (views.get(p.id as string) ?? 0) < DEFAULT_MIN_VIEWS).map((p) => p.id as string);
  const alreadyJudged = ready.length - ids.length;
  if (!ids.length) return { activated: 0, not_ready: notReady, already_judged: alreadyJudged };

  const { error: updateError } = await sb.from('products').update({ active: true }).in('id', ids);
  if (updateError) {
    console.error('[api] pipeline/run (activation) :', updateError.message);
    return { activated: 0, error: "la mise en ligne a échoué" };
  }
  clearTtlCache(); // les catégories apparaissent d'elles-mêmes dès qu'un produit est en ligne

  return { activated: ids.length, not_ready: notReady, already_judged: alreadyJudged };
}

// ─── Main handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();

  const parsed = await readOptionalJsonObject(req);
  if ('response' in parsed) return parsed.response;
  const body = parsed.body;

  if (body.dry_run !== undefined && typeof body.dry_run !== 'boolean') return badRequest('dry_run doit être un booléen');
  const dryRun = body.dry_run === true;

  const maxProducts = body.max_products === undefined ? 5 : body.max_products;
  if (typeof maxProducts !== 'number' || !Number.isInteger(maxProducts) || maxProducts < 1 || maxProducts > MAX_PRODUCTS_LIMIT) {
    return badRequest(`max_products doit être un entier entre 1 et ${MAX_PRODUCTS_LIMIT}`);
  }

  let steps: Step[] = [...ALL_STEPS];
  if (body.steps !== undefined) {
    if (!Array.isArray(body.steps) || body.steps.length === 0 || body.steps.some((s) => !ALL_STEPS.includes(s as Step))) {
      return badRequest(`steps invalide (valeurs possibles : ${ALL_STEPS.join(', ')})`);
    }
    steps = body.steps as Step[];
  }

  if (body.market !== undefined && body.market !== null && (typeof body.market !== 'string' || !isValidMarket(body.market))) {
    return badRequest('Marché invalide (fr, es ou uk)');
  }

  const startTime = Date.now();
  const results: Record<string, unknown> = {};

  if (steps.includes('discover')) {
    const r = await runDiscover({ market: marketFrom(body.market), threshold: DEFAULT_THRESHOLD, dryRun, maxImport: maxProducts });
    results.discover = r.status === 200 ? r.body : { error: r.body.error ?? 'échec', status: r.status };
  }

  if (steps.includes('generate')) {
    results.generate = dryRun ? { skipped: 'dry_run' } : await stepGenerate(maxProducts);
  }

  if (steps.includes('activate')) {
    results.activate = dryRun ? { skipped: 'dry_run' } : await stepActivate();
  }

  if (steps.includes('optimize')) {
    const r = await runAutoOptimize({ dryRun, minViews: DEFAULT_MIN_VIEWS, pauseThreshold: 0.5, scaleThreshold: 5.0 });
    results.optimize = r.status === 200 ? r.body : { error: r.body.error ?? 'échec', status: r.status };
    if (!dryRun && r.status === 200) clearTtlCache();
  }

  // Une étape en échec ne doit pas être présentée comme un succès global.
  const failed = Object.entries(results).filter(([, v]) => v && typeof v === 'object' && 'error' in (v as object)).map(([k]) => k);

  return NextResponse.json({
    success: failed.length === 0,
    failed_steps: failed,
    dry_run: dryRun,
    duration_ms: Date.now() - startTime,
    steps_run: steps,
    results,
    ran_at: new Date().toISOString(),
  }, { status: failed.length === 0 ? 200 : 207 });
}
