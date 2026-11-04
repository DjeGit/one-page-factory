/**
 * Découverte de produits Amazon (scraping + notation + import en brouillon), partagée par
 * /api/pipeline/discover et par l'orchestrateur /api/pipeline/run (appel direct, sans requête HTTP
 * vers son propre site).
 */
import { getSupabaseAdmin, generateSlug } from '@/lib/supabase';
import { DEFAULT_MARKET, isValidMarket, type Market } from '@/lib/market';
import amazonScrapingFallback from '@/lib/integrations/data-sources/amazon-scraping-fallback';
import { scoreSignal } from '@/lib/market/scoring';
import { isHttpUrl, type JsonBody } from './http';

export const DEFAULT_THRESHOLD = 60;
export const DEFAULT_MAX_IMPORT = 5;
const MAX_IMPORT_LIMIT = 50;

export function marketFrom(value: unknown): Market {
  return typeof value === 'string' && isValidMarket(value) ? value : DEFAULT_MARKET;
}

export interface DiscoverParams {
  market: Market;
  threshold: number;
  dryRun: boolean;
  maxImport: number;
}

/** Valide les paramètres (corps JSON) ; marché absent = défaut, marché présent mais faux = erreur. */
export function parseDiscoverParams(body: JsonBody): { params: DiscoverParams } | { error: string } {
  if (body.market !== undefined && body.market !== null && body.market !== '') {
    if (typeof body.market !== 'string' || !isValidMarket(body.market)) return { error: 'Marché invalide (fr, es ou uk)' };
  }
  const threshold = body.threshold === undefined || body.threshold === null ? DEFAULT_THRESHOLD : body.threshold;
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    return { error: 'threshold doit être un nombre entre 0 et 100' };
  }
  const maxImport = body.max_import === undefined || body.max_import === null ? DEFAULT_MAX_IMPORT : body.max_import;
  if (typeof maxImport !== 'number' || !Number.isInteger(maxImport) || maxImport < 0 || maxImport > MAX_IMPORT_LIMIT) {
    return { error: `max_import doit être un entier entre 0 et ${MAX_IMPORT_LIMIT}` };
  }
  if (body.dry_run !== undefined && body.dry_run !== null && typeof body.dry_run !== 'boolean') {
    return { error: 'dry_run doit être un booléen' };
  }
  return { params: { market: marketFrom(body.market), threshold, dryRun: body.dry_run === true, maxImport } };
}

export async function discoverAndScore(market: Market) {
  const signals = await amazonScrapingFallback.fetchTrendingProducts(market);
  return signals
    .map((signal) => ({ signal, ...scoreSignal(signal) }))
    .sort((a, b) => b.score - a.score);
}

export interface DiscoverResult {
  status: number;
  body: Record<string, unknown>;
}

export async function runDiscover(p: DiscoverParams): Promise<DiscoverResult> {
  let scored: Awaited<ReturnType<typeof discoverAndScore>>;
  try {
    scored = await discoverAndScore(p.market);
  } catch (err) {
    console.error('[api] pipeline/discover (scraping) :', err instanceof Error ? err.message : err);
    return { status: 502, body: { error: "La source de produits (Amazon) n'a pas répondu. Réessayez plus tard." } };
  }
  const candidates = scored.filter((x) => x.score >= p.threshold);

  if (p.dryRun) {
    return {
      status: 200,
      body: {
        dry_run: true,
        market: p.market,
        total_scraped: scored.length,
        candidates: candidates.length,
        threshold: p.threshold,
        top20: scored.slice(0, 20).map(({ signal, score }) => ({
          name: signal.name,
          score,
          category: signal.category,
          price: signal.price,
          rating: signal.rating,
          reviews: signal.reviewCount,
        })),
      },
    };
  }

  const sb = getSupabaseAdmin();
  const toImport = candidates.slice(0, p.maxImport);
  const imported: Array<{ id: string; name: string; slug: string; score: number }> = [];
  const skipped: Array<{ name: string; reason: string }> = [];

  // Categories (23/09) — tout import automatique Amazon va par defaut
  // dans "Best of Amazon" ; la curation fine (deplacer un produit vers
  // Tech/Mode/etc.) se fait ensuite a la main dans l'admin.
  const { data: defaultCategory } = await sb
    .from('categories')
    .select('id')
    .eq('slug', 'best-of-amazon')
    .maybeSingle();

  for (const { signal, score } of toImport) {
    // Un signal sans lien exploitable donnerait une fiche sans bouton d'achat : on l'ignore.
    if (!isHttpUrl(signal.url)) {
      skipped.push({ name: signal.name, reason: 'lien produit invalide' });
      continue;
    }
    const slug = generateSlug(signal.name);
    if (!slug) {
      skipped.push({ name: signal.name, reason: 'nom inexploitable' });
      continue;
    }
    const { data: existing, error: lookupError } = await sb.from('products').select('id').eq('slug', slug).maybeSingle();
    if (lookupError) {
      console.error('[api] pipeline/discover (doublon) :', lookupError.message);
      skipped.push({ name: signal.name, reason: 'vérification impossible' });
      continue;
    }

    if (existing) {
      skipped.push({ name: signal.name, reason: 'already exists' });
      continue;
    }

    const { data: product, error } = await sb
      .from('products')
      .insert({
        name: signal.name,
        slug,
        affiliate_url: signal.url,
        price: signal.price,
        image_url: signal.image || null,
        description: `${signal.category || ''} — ${signal.rating ? `Note : ${signal.rating}/5` : ''} ${
          signal.reviewCount ? `(${signal.reviewCount} avis)` : ''
        }`.trim(),
        market: p.market,
        product_source: 'auto_discovered',
        category_id: defaultCategory?.id ?? null,
        active: false,
      })
      .select('id')
      .single();

    if (error || !product) {
      console.error('[api] pipeline/discover (insertion) :', error?.message);
      skipped.push({ name: signal.name, reason: 'insertion impossible' });
    } else {
      imported.push({ id: product.id as string, name: signal.name, slug, score });
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      market: p.market,
      total_scraped: scored.length,
      candidates: candidates.length,
      imported: imported.length,
      skipped: skipped.length,
      imported_products: imported,
      skipped_products: skipped,
      threshold: p.threshold,
    },
  };
}
