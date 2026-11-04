import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, generateSlug } from '@/lib/supabase';
import { clearTtlCache } from '@/lib/ttl-cache';
import { getActiveMarket } from '@/lib/get-active-market';
import { isValidMarket } from '@/lib/market';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isHttpUrl, readJsonObject, unauthorized } from '../_lib/http';

const MAX_ROWS = 100;

/** « 19,99 », « 19.99 » ou « 1 299,00 » -> nombre ; null si illisible. (parseFloat('19,99') donnait 19.) */
function toPrice(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n <= 10_000_000 ? n : null;
}

// Les réponses d'échec portent aussi created/skipped : l'écran d'import les affiche tels quels.
function fail(error: string, status: number, total = 0) {
  return NextResponse.json({ success: false, error, total, created: 0, skipped: total, results: [] }, { status });
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const parsed = await readJsonObject(req);
  if ('response' in parsed) return fail('Corps de requête JSON invalide', 400);
  const body = parsed.body;

  const rows = Array.isArray(body.rows) ? (body.rows as Record<string, unknown>[]) : [];
  if (body.market !== undefined && body.market !== null && body.market !== '' && !isValidMarket(body.market as string)) {
    return fail('Marché invalide (fr, es ou uk)', 400, rows.length);
  }
  const market = isValidMarket(body.market as string) ? (body.market as 'fr' | 'es' | 'uk') : getActiveMarket();

  if (!rows.length) return fail('Aucune ligne', 400);
  if (rows.length > MAX_ROWS) return fail(`Maximum ${MAX_ROWS} lignes`, 400, rows.length);

  const sb = getSupabaseAdmin();
  const results: { name?: unknown; status: 'created' | 'skipped' | 'error'; reason?: string; product_id?: string; slug?: string }[] = [];

  // Slugs : on récupère en UNE requête ceux qui existent déjà, puis on garantit l'unicité en mémoire
  // (y compris deux lignes du même fichier ayant le même nom). Avant : 1 requête par ligne.
  const valid: { row: Record<string, unknown>; name: string; affiliate: string; baseSlug: string }[] = [];
  for (const row of rows) {
    const name = typeof row?.name === 'string' ? row.name.trim().slice(0, 300) : '';
    const affiliate = typeof row?.affiliate_url === 'string' ? row.affiliate_url.trim() : '';
    if (!name || !affiliate) {
      results.push({ name: row?.name, status: 'skipped', reason: 'Nom ou URL manquant' });
      continue;
    }
    if (!isHttpUrl(affiliate)) {
      results.push({ name, status: 'skipped', reason: "URL d'affiliation invalide (http/https attendu)" });
      continue;
    }
    valid.push({ row, name, affiliate, baseSlug: generateSlug(name) || 'produit' });
  }

  const taken = new Set<string>();
  if (valid.length) {
    const { data: existing, error } = await sb.from('products').select('slug').in('slug', Array.from(new Set(valid.map((v) => v.baseSlug))));
    if (error) {
      console.error('[api] POST /api/import (slugs) :', error.message);
      return fail("Lecture de la base impossible, l'import n'a pas été lancé.", 500, rows.length);
    }
    (existing ?? []).forEach((e) => taken.add(e.slug as string));
  }

  const toInsert = valid.map((v) => {
    let slug = v.baseSlug;
    if (taken.has(slug)) slug = `${slug}-${Date.now().toString(36)}${taken.size.toString(36)}`;
    taken.add(slug);
    return { ...v, slug };
  });

  const insertOne = async (v: (typeof toInsert)[number]) => {
    // redirect_code : valeur par défaut de la base (aléatoire cryptographique), plus de Math.random().
    const { data: product, error } = await sb.from('products').insert({
      name: v.name,
      slug: v.slug,
      affiliate_url: v.affiliate,
      price: toPrice(v.row.price),
      original_price: toPrice(v.row.original_price),
      image_url: typeof v.row.image_url === 'string' && v.row.image_url.trim() ? v.row.image_url.trim() : null,
      description: typeof v.row.description === 'string' && v.row.description.trim() ? v.row.description.trim() : null,
      active: false, // inactive until AI content generated
      // Fiche importée à la main : le pipeline automatique (/api/pipeline/run) ne doit jamais la générer ni la publier.
      product_source: 'manual_affiliate',
      market,
    }).select('id, slug').single();

    if (error || !product) {
      console.error('[api] POST /api/import (insertion) :', v.name, error?.message);
      results.push({ name: v.name, status: 'error', reason: error?.code === '23505' ? 'Produit déjà existant (doublon)' : "Enregistrement impossible" });
      return;
    }
    results.push({ name: v.name, status: 'created', product_id: product.id, slug: product.slug });
  };
  for (let i = 0; i < toInsert.length; i += 10) {
    await Promise.all(toInsert.slice(i, i + 10).map(insertOne));
  }

  const created = results.filter(r => r.status === 'created').length;
  if (created > 0) clearTtlCache();
  const body2 = { success: created > 0, total: rows.length, created, skipped: rows.length - created, results };
  // Rien n'a été créé alors qu'il y avait des lignes valides : c'est un échec, pas un succès à 0.
  return NextResponse.json(body2, { status: created === 0 && valid.length > 0 ? 422 : 200 });
}
