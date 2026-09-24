/**
 * /api/pipeline/run
 *
 * Orchestrateur principal — enchaîne automatiquement :
 *   1. Discover   → scrape Amazon, score, importe les nouveaux produits
 *   2. Generate   → génère le contenu IA pour tous les produits sans contenu
 *   3. Activate   → active les produits dont le contenu est complet
 *   4. Optimize   → pause les produits sous-performants
 *
 * POST body: { steps?: string[], dry_run?: boolean, max_products?: number, market?: 'fr'|'es'|'uk' }
 *   steps: ["discover", "generate", "activate", "optimize"] (all by default)
 *   market: marché ciblé par l'étape discover (défaut 'fr' — le cron déclenche un run par marché, cf. pipeline-cron.sh)
 *
 * Auth: Bearer PIPELINE_SECRET (ou ADMIN_SECRET)
 * Idempotent — peut être appelé plusieurs fois sans effet de bord.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, generateSlug } from '@/lib/supabase';
import { generateProductContent } from '@/lib/ai';
import { isAuthorizedRequest } from '@/lib/admin-auth';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const AUTH_HEADER = {
  Authorization: `Bearer ${process.env.PIPELINE_SECRET || process.env.ADMIN_SECRET || ''}`,
  'Content-Type': 'application/json',
};

// ─── Step 1: Discover ──────────────────────────────────────────────────────

async function stepDiscover(dryRun: boolean, maxImport: number, market?: string) {
  const res = await fetch(`${BASE_URL}/api/pipeline/discover`, {
    method: 'POST',
    headers: AUTH_HEADER,
    body: JSON.stringify({ threshold: 60, dry_run: dryRun, max_import: maxImport, market }),
  });
  return res.json();
}

// ─── Step 2: Generate content for all products without AI content ──────────

async function stepGenerate(maxProducts: number) {
  const sb = getSupabaseAdmin();

  // Products with no hero_title = no AI content yet
  const { data: products } = await sb
    .from('products')
    .select('id, name, description, price, market')
    .is('hero_title', null)
    .eq('active', false)
    .limit(maxProducts);

  if (!products?.length) return { generated: 0, errors: 0 };

  let generated = 0;
  let errors = 0;

  for (const p of products) {
    try {
      const content = await generateProductContent(
        p.description || p.name,
        p.name,
        p.price,
        p.market
      );

      await sb
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

      generated++;
    } catch (err) {
      console.error(`Generate error for ${p.name}:`, err);
      errors++;
    }

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 12000));
  }

  return { generated, errors };
}

// ─── Step 3: Activate products with complete content ──────────────────────

async function stepActivate() {
  const sb = getSupabaseAdmin();

  const { data: products } = await sb
    .from('products')
    .select('id')
    .eq('active', false)
    .not('hero_title', 'is', null)
    .not('affiliate_url', 'is', null);

  if (!products?.length) return { activated: 0 };

  const ids = products.map((p) => p.id);
  await sb.from('products').update({ active: true }).in('id', ids);

  return { activated: ids.length };
}

// ─── Step 4: Auto-optimize ────────────────────────────────────────────────

async function stepOptimize(dryRun: boolean) {
  const res = await fetch(`${BASE_URL}/api/auto-optimize`, {
    method: 'POST',
    headers: AUTH_HEADER,
    body: JSON.stringify({ dry_run: dryRun, min_views: 500, pause_threshold: 0.5 }),
  });
  return res.json();
}

// ─── Main handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun: boolean = body.dry_run ?? false;
  const maxProducts: number = body.max_products ?? 5;
  const steps: string[] = body.steps ?? ['discover', 'generate', 'activate', 'optimize'];

  const startTime = Date.now();
  const results: Record<string, unknown> = {};

  if (steps.includes('discover')) {
    results.discover = await stepDiscover(dryRun, maxProducts, body.market);
  }

  if (steps.includes('generate')) {
    results.generate = dryRun ? { skipped: 'dry_run' } : await stepGenerate(maxProducts);
  }

  if (steps.includes('activate')) {
    results.activate = dryRun ? { skipped: 'dry_run' } : await stepActivate();
  }

  if (steps.includes('optimize')) {
    results.optimize = await stepOptimize(dryRun);
  }

  return NextResponse.json({
    success: true,
    dry_run: dryRun,
    duration_ms: Date.now() - startTime,
    steps_run: steps,
    results,
    ran_at: new Date().toISOString(),
  });
}
