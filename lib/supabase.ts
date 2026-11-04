import { loadCategoryCounts, loadDashboardStats, loadProductCounts } from '@/lib/analytics/stats';
import { createRecentGuard } from '@/lib/analytics/dedup';
import { startOfTodayIso } from '@/lib/analytics/period';
import { visibleCategories } from '@/lib/category-visibility';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Category, Product, AnalyticsData, DashboardStats } from '@/types';
import type { Market } from '@/lib/market';
import type { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { isBotUserAgent } from '@/lib/bot-detection';
import { invalidateTtlCache, ttlCache } from '@/lib/ttl-cache';

// Client Supabase créé à la première utilisation (les variables d'environnement sont alors disponibles).
//
// Il n'existe volontairement QU'UN client : celui de la clé service_role, côté serveur. Le client « anon »
// (clé publique) n'était utilisé nulle part et la base refuse de toute façon tout accès à ce rôle (RLS, migration
// 20260918000001) : le supprimer évite de garder une porte inutile. Ce fichier ne doit jamais être importé par un
// composant client ('use client').
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

/** Au-delà, on abandonne la requête : un Supabase qui ne répond plus ne doit pas bloquer indéfiniment l'unique process Node. */
export const SUPABASE_FETCH_TIMEOUT_MS = 20_000;

/**
 * fetch utilisé par supabase-js :
 *  - `cache: 'no-store'` : Next.js 14 met en cache les fetch côté serveur (« Data Cache ») pour toute page ou route non
 *    dynamique — une lecture Supabase pouvait alors rester figée indéfiniment, y compris après une modification dans
 *    l'admin. Le seul cache voulu est lib/ttl-cache.ts (60 s, vidé à chaque écriture).
 *  - délai maximal (SUPABASE_FETCH_TIMEOUT_MS).
 */
export function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS);
  const outer = init.signal;
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, cache: 'no-store', signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Admin client (for server-side operations with elevated privileges)
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      // Audit 21/09 : repli silencieux sur la clé anon si la clé service
      // role est absente. RLS bloque totalement ce rôle (Sprint 0) — un
      // repli silencieux ne dégrade donc pas gracieusement, il transforme
      // un problème de config en échecs RLS confus partout dans l'admin,
      // difficiles à diagnostiquer. On garde le repli (pour ne jamais
      // planter le build si la variable n'est pas encore injectée à ce
      // stade) mais le signale désormais bien fort dans les logs serveur.
      // Attention : avec RLS, les lectures ne renvoient pas d'erreur mais des listes VIDES — site « vide » = vérifier
      // d'abord cette variable.
      console.error(
        '[supabase] SUPABASE_SERVICE_ROLE_KEY absente — repli sur la clé anon, RLS va bloquer la quasi-totalité des opérations admin.'
      );
    }
    _supabaseAdmin = createClient(getSupabaseUrl(), serviceKey || getSupabaseAnonKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: { fetch: fetchWithTimeout },
    });
  }
  return _supabaseAdmin;
}

// Alias paresseux pour le code de ce fichier.
const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// =====================
// Erreurs de base de données
// =====================

type DbError = { code?: string; message?: string; details?: string } | null | undefined;

/** « Aucune ligne » (PGRST116) n'est pas une panne ; tout le reste en est une. */
function isNoRowError(error: DbError): boolean {
  return error?.code === 'PGRST116';
}

/**
 * Pour une lecture d'UNE ligne : « introuvable » → on renvoie null (le site affiche sa page 404), mais une vraie panne
 * est journalisée et remontée. Avant, une coupure de Supabase se transformait en 404 : les moteurs de recherche voient
 * alors des pages disparues, au lieu d'une erreur temporaire (500) qu'ils réessaient plus tard.
 */
function failOnRealError(context: string, error: DbError): void {
  if (!error || isNoRowError(error)) return;
  console.error(`[supabase] ${context} :`, error.message ?? error);
  throw new Error(`${context} : ${error.message ?? 'erreur de base de données'}`);
}

/** Pour une liste : une panne est remontée (jamais « liste vide » à la place, qui serait mise en cache par le CDN). */
function throwIfError(context: string, error: DbError): void {
  if (!error) return;
  console.error(`[supabase] ${context} :`, error.message ?? error);
  throw new Error(`${context} : ${error.message ?? 'erreur de base de données'}`);
}

/**
 * Lit TOUTES les lignes d'une requête par pages de 1000. PostgREST plafonne silencieusement chaque réponse à 1000 lignes
 * (réglage Supabase par défaut) : sans pagination, le 1001e produit « n'existe pas » sans aucune erreur.
 * `build` doit trier de façon STABLE (ex. created_at puis id), sinon des lignes peuvent être sautées ou répétées.
 */
export async function fetchAllPages<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: DbError }>,
  pageSize: number = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    throwIfError('lecture paginée', error);
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

/** À appeler après toute écriture qui change ce que voit le site public (produit, catégorie…). */
export function invalidatePublicCaches(): void {
  invalidateTtlCache();
}

// Helper to generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Hash IP for privacy
//
// Audit 21/09 : erreur de précédence d'opérateurs — `+` se lie avant `||`,
// donc l'expression se lisait (ip + process.env.ADMIN_SECRET) || 'salt'.
// Avec ADMIN_SECRET absent, `ip + undefined` donne une chaîne non vide
// (ex. "1.2.3.4undefined"), donc le fallback 'salt' ne se déclenchait
// jamais — code mort, sans impact pratique (ADMIN_SECRET est toujours
// défini en prod) mais corrigé pour que l'intention soit sans ambiguïté.
//
// Exportée : app/api/go/[code]/route.ts en avait une copie pour son contrôle anti-fraude (« combien de clics de cette IP
// depuis 1 h ») et il faut IMPÉRATIVEMENT le même calcul que celui qui écrit clicks.ip_hash — sinon le contrôle ne
// trouve plus rien, sans erreur. Importer ces deux fonctions plutôt que de les recopier.
export function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.ADMIN_SECRET || 'salt')).digest('hex').slice(0, 16);
}

/** IP du visiteur d'après l'en-tête du reverse-proxy ; 'unknown' si absente. */
export function getClientIp(req: Pick<NextRequest, 'headers'>): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip || 'unknown';
}

/**
 * Empreinte à stocker : null quand l'IP est inconnue. Avant, toutes les IP inconnues partageaient le même hash
 * ('unknown'), donc UNE seule vue par produit et par jour était comptée pour l'ensemble de ces visiteurs.
 */
function ipHashOrNull(req: Pick<NextRequest, 'headers'>): string | null {
  const ip = getClientIp(req);
  return ip === 'unknown' ? null : hashIp(ip);
}

// =====================
// Product operations
//
// Sprint 1 (multi-marché) : getProduct/getProductById/getProductByCode
// restent SANS filtre marché — ce sont les fonctions utilisées par les
// routes PUBLIQUES (page produit, redirect /go/[code]), où le marché est
// déterminé par la ligne elle-même (product.market), pas par une
// préférence admin. Les fonctions de LISTE/ADMIN (getAllProducts,
// createProduct, getAnalytics, getDashboardStats) prennent un paramètre
// `market` explicite — elles sont appelées depuis app/admin/** et
// app/api/** routes internes, filtrées via getActiveMarket().
// =====================

export async function getProduct(slug: string): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();

  failOnRealError(`lecture du produit « ${slug} »`, error);
  return (data as Product | null) ?? null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  failOnRealError(`lecture du produit ${id}`, error);
  return (data as Product | null) ?? null;
}

/**
 * Produits actifs par liste d'ids, dans un ordre quelconque (le call site
 * réordonne si besoin) — utilisé par /blog/[slug] pour afficher les
 * produits liés à un article (blog_posts.linked_product_ids). Ignore
 * silencieusement les ids inconnus/inactifs plutôt que d'échouer : un
 * produit désactivé après la publication de l'article ne doit pas casser
 * la page, juste disparaître de la liste affichée.
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .in('id', ids)
    .eq('active', true);

  if (error || !data) {
    // Fonction secondaire d'une page d'article : on n'empêche pas la page de s'afficher, mais on le journalise.
    console.error('[supabase] lecture des produits liés impossible :', error?.message);
    return [];
  }
  return data as Product[];
}

export async function getProductByCode(code: string): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('redirect_code', code)
    .eq('active', true)
    .maybeSingle();

  failOnRealError(`lecture du lien /go/${code}`, error);
  return (data as Product | null) ?? null;
}

// market omis = tous marchés confondus (utilisé par les pages PUBLIQUES,
// ex. app/bio/page.tsx, qui n'ont pas de notion de marché admin actif).
// Les pages/routes ADMIN doivent toujours passer explicitement
// getActiveMarket().
//
// Pagination (PostgREST plafonne à 1000 lignes par réponse) et erreur remontée au lieu d'une liste vide.
// `columns` : pour les écrans qui n'ont besoin que de quelques champs (ex. 'id, name, slug, market, active'),
// évite de transporter les textes IA (FAQ, témoignages, script TikTok) de chaque produit.
export async function getAllProducts(market?: Market, columns: string = '*'): Promise<Product[]> {
  return fetchAllPages<Product>((from, to) => {
    let query = supabaseAdmin.from('products').select(columns);
    if (market) query = query.eq('market', market);
    return query
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to) as unknown as PromiseLike<{ data: Product[] | null; error: DbError }>;
  });
}

// Categories (23/09) — liste complete triee par sort_order, utilisee par
// l'admin (formulaire produit) et par la nav publique.
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  throwIfError('lecture des catégories', error);
  return (data || []) as Category[];
}

// Categories visibles publiquement (nav, accueil, /produits, /c/[slug]).
// Depuis le 19/10 la visibilité est AUTOMATIQUE : une catégorie s'affiche sur un marché dès qu'elle a un produit en
// ligne dessus (lib/category-visibility.ts). Les colonnes is_active / active_markets ne sont plus lues.
export async function getActiveCategories(market?: Market): Promise<Category[]> {
  // Cache 60 s (lecture publique, voir lib/ttl-cache.ts) ; vidé à chaque écriture produit/catégorie faite ici.
  const [all, counts] = await Promise.all([
    ttlCache('categories:all', 60_000, getCategories),
    ttlCache('categories:counts', 60_000, getCategoryProductCounts, (v) => Object.keys(v).length === 0),
  ]);
  return visibleCategories(all, counts, market);
}

/**
 * Produits en ligne par catégorie et par marché (sert au site public et à l'admin).
 * Une seule requête SQL (opf_category_product_counts) une fois la migration 20261104000001 appliquée ;
 * sinon lecture paginée. En cas de panne : erreur (jamais un comptage partiel qui masquerait des catégories).
 */
export async function getCategoryProductCounts(): Promise<Record<string, Record<Market, number>>> {
  return loadCategoryCounts(supabaseAdmin);
}

/**
 * Active/masque une categorie pour UN marche seulement. is_active reste
 * synchronise (vrai des qu'un marche au moins est actif) pour le code
 * historique qui le lit encore.
 */
export async function setCategoryMarketActive(id: string, market: Market, active: boolean): Promise<Category | null> {
  const { data: current, error: readError } = await supabaseAdmin.from('categories').select('*').eq('id', id).single();
  if (readError || !current) {
    console.error('Error reading category:', readError);
    return null;
  }
  const row = current as Category;
  if (!Array.isArray(row.active_markets)) {
    console.error('categories.active_markets absente : appliquer la migration 20261018000001_categories_active_markets.sql');
    return null;
  }
  const next = new Set<Market>(row.active_markets);
  if (active) next.add(market);
  else next.delete(market);
  const list = Array.from(next);
  return updateCategory(id, { active_markets: list, is_active: list.length > 0 });
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  failOnRealError(`lecture de la catégorie « ${slug} »`, error);
  return (data as Category | null) ?? null;
}

// Produits actifs d'une categorie pour un marche donne — page publique
// /c/[slug].
export async function getActiveProductsByCategory(categoryId: string, market: Market): Promise<Product[]> {
  return fetchAllPages<Product>((from, to) =>
    supabaseAdmin
      .from('products')
      .select('*')
      .eq('category_id', categoryId)
      .eq('market', market)
      .eq('active', true)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to) as unknown as PromiseLike<{ data: Product[] | null; error: DbError }>,
  );
}

export async function createCategory(categoryData: Partial<Category> & { slug: string; name_fr: string; name_es: string; name_uk: string }): Promise<Category | null> {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert(categoryData)
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return null;
  }
  invalidatePublicCaches();
  return data as Category;
}

export async function updateCategory(id: string, categoryData: Partial<Category>): Promise<Category | null> {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .update(categoryData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    return null;
  }
  invalidatePublicCaches();
  return data as Category;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    return false;
  }
  invalidatePublicCaches();
  return true;
}

// =====================
// Écriture des produits
//
// Un produit = jusqu'à 3 fiches (une par marché) reliées par source_product_ref : la fiche « racine » (souvent la FR)
// a source_product_ref NULL, les autres pointent vers son id (voir lib/market-sync.ts).
// =====================

/** Colonnes qu'un appel d'API n'a jamais le droit de modifier : identité, horodatages gérés par la base, lien /go publié. */
const READ_ONLY_PRODUCT_FIELDS = ['id', 'created_at', 'updated_at', 'redirect_code', 'category', 'sync'] as const;

/**
 * Prépare ce qu'on envoie à la base lors d'une modification :
 *  - retire les champs en lecture seule (le formulaire renvoie parfois l'objet complet, y compris la jointure
 *    `category`, qui n'est pas une colonne et ferait échouer toute la mise à jour) ;
 *  - garde image_url synchronisé avec la 1re photo de la galerie (`images`), comme le promet la migration 20261006.
 */
export function sanitizeProductPatch(input: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = { ...input };
  for (const key of READ_ONLY_PRODUCT_FIELDS) delete patch[key];
  for (const key of Object.keys(patch)) if (patch[key] === undefined) delete patch[key];

  if (Array.isArray(patch.images) && patch.image_url === undefined) {
    const first = (patch.images as unknown[]).find((v): v is string => typeof v === 'string' && v.trim() !== '');
    patch.image_url = first ?? null;
  }
  return patch;
}

export async function createProduct(productData: Partial<Product> & { market: Market }): Promise<Product | null> {
  const baseSlug = productData.slug || generateSlug(productData.name || '');
  if (!baseSlug) {
    console.error('Error creating product: nom vide, impossible de fabriquer une adresse (slug).');
    return null;
  }

  // Ensure slug is unique (vérification rapide ; la contrainte UNIQUE de la base reste l'arbitre en cas de course)
  const { data: existing } = await supabaseAdmin.from('products').select('slug').eq('slug', baseSlug).maybeSingle();
  let slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;

  const row = {
    ...productData,
    // Une fiche créée sans consigne explicite n'est JAMAIS mise en ligne toute seule.
    active: productData.active ?? false,
    pain_points: productData.pain_points || [],
    benefits: productData.benefits || [],
    faq: productData.faq || [],
    testimonials: productData.testimonials || [],
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabaseAdmin.from('products').insert({ ...row, slug }).select().single();
    if (!error) {
      invalidatePublicCaches();
      return data as Product;
    }
    // 23505 sur le slug = adresse déjà prise (création simultanée) : on retente une fois avec un suffixe.
    if (error.code === '23505' && /slug/.test(`${error.message} ${error.details ?? ''}`) && attempt === 0) {
      slug = `${baseSlug}-${Date.now()}`;
      continue;
    }
    console.error('Error creating product:', error);
    return null;
  }
  return null;
}

export async function updateProduct(id: string, productData: Partial<Product>): Promise<Product | null> {
  const patch = sanitizeProductPatch(productData as Record<string, unknown>);
  if (Object.keys(patch).length === 0) return getProductById(id);

  const { data, error } = await supabaseAdmin
    .from('products')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating product:', error);
    return null;
  }
  invalidatePublicCaches();
  return data as Product;
}

/**
 * Supprime UNE fiche (un marché). Si c'est la fiche « racine » d'un produit présent sur d'autres marchés, une des
 * fiches restantes devient la nouvelle racine d'abord : sinon les autres marchés restaient reliés à un identifiant
 * disparu (voir aussi le déclencheur SQL de la migration 20261104000002, qui garantit la même chose pour toute
 * suppression, y compris hors de cette fonction).
 */
export async function deleteProduct(id: string): Promise<boolean> {
  if (!(await promoteNewRoot(id))) return false;

  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting product:', error);
    return false;
  }
  invalidatePublicCaches();
  return true;
}

/** Si `id` est une racine avec des fiches liées, rattache celles-ci à la plus ancienne d'entre elles. */
async function promoteNewRoot(id: string): Promise<boolean> {
  const { data: children, error } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('source_product_ref', id)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (error) {
    console.error('Error reading linked products before delete:', error);
    return false;
  }
  if (!children || children.length === 0) return true;

  const newRootId = children[0].id as string;
  const { error: e1 } = await supabaseAdmin.from('products').update({ source_product_ref: null }).eq('id', newRootId);
  if (e1) {
    console.error('Error promoting new root product:', e1);
    return false;
  }
  const others = children.slice(1).map((c) => c.id as string);
  if (others.length > 0) {
    const { error: e2 } = await supabaseAdmin.from('products').update({ source_product_ref: newRootId }).in('id', others);
    if (e2) {
      console.error('Error relinking products to new root:', e2);
      return false;
    }
  }
  return true;
}

// =====================
// Analytics operations
// =====================

// Double-clic / pré-chargement : un même visiteur ne compte qu'une fois sur ce produit pendant 10 s.
const CLICK_DEDUP_MS = 10_000;
const alreadyClicked = createRecentGuard(CLICK_DEDUP_MS);

export async function trackClick(productId: string, req: NextRequest): Promise<void> {
  const userAgent = req.headers.get('user-agent') || null;
  // Sprint 5 : un bot qui suit un lien /go/[code] (link-checker, crawler
  // SEO) ne représente pas une intention d'achat — on ne le compte pas.
  if (isBotUserAgent(userAgent)) return;

  const ipHash = ipHashOrNull(req);
  if (ipHash && alreadyClicked(`${productId}:${ipHash}`)) return;
  const referer = req.headers.get('referer') || null;

  const { error } = await supabaseAdmin.from('clicks').insert({
    product_id: productId,
    ip_hash: ipHash,
    user_agent: userAgent,
    referer: referer,
  });
  // Un clic perdu ne doit pas empêcher la redirection, mais il ne doit plus disparaître sans trace.
  if (error) console.error('[supabase] enregistrement du clic impossible :', error.message);
}

export async function trackPageView(productId: string, req: NextRequest): Promise<void> {
  const userAgent = req.headers.get('user-agent') || null;
  // Sprint 5 (suite à la question de Jerome sur la fiabilité des vues) :
  // deux filtres avant de compter une vue —
  //  1. bots/crawlers connus (lib/bot-detection.ts) : jamais comptés.
  //  2. déduplication IP+produit+jour, appliquée côté DB via l'upsert +
  //     l'index unique de la migration 20260920000003 : un même visiteur
  //     qui recharge la page plusieurs fois dans la journée ne compte que
  //     pour une vue (il recompte le lendemain — c'est voulu, on mesure du
  //     trafic, pas des visiteurs uniques all-time).
  if (isBotUserAgent(userAgent)) return;

  const ipHash = ipHashOrNull(req);
  const referer = req.headers.get('referer') || null;
  const row = { product_id: productId, ip_hash: ipHash, user_agent: userAgent, referer: referer };

  const { error } = await supabaseAdmin
    .from('page_views')
    .upsert(row, { onConflict: 'product_id,ip_hash,viewed_date', ignoreDuplicates: true });
  if (!error) return;

  // 42P10 / 42703 : l'index unique ou la colonne viewed_date manque (migration 20260920000003 non appliquée).
  // Avant, l'erreur était ignorée : AUCUNE vue n'était enregistrée, sans le moindre message.
  if (error.code === '42P10' || error.code === '42703') {
    console.error('[supabase] déduplication des vues indisponible (migration 20260920000003 à appliquer) — vue enregistrée sans déduplication.');
    const { error: insertError } = await supabaseAdmin.from('page_views').insert(row);
    if (insertError) console.error('[supabase] enregistrement de la vue impossible :', insertError.message);
    return;
  }
  console.error('[supabase] enregistrement de la vue impossible :', error.message);
}

// market omis = agrégat tous marchés (compat pages publiques / anciens
// appels). Les vues admin doivent passer explicitement getActiveMarket().
//
// Un seul aller-retour (opf_product_counts) une fois la migration 20261104000001 appliquée.
export async function getAnalytics(market?: Market, productId?: string): Promise<AnalyticsData[]> {
  const rows = await loadProductCounts(supabaseAdmin, { market, productId });

  return rows.map((row) => {
    const clicks = row.clicks;
    const views = row.views;
    const ctr = views > 0 ? (clicks / views) * 100 : 0;
    const price = row.price || 0;
    // Estimate EPC: assume 2% conversion et 30% commission
    // (remplacé par lib/analytics/roi.ts au Sprint 5 — conservé ici pour compat le temps de la transition)
    const epc = clicks > 0 ? (clicks * 0.02 * price * 0.3) / clicks : 0;
    const revenueEstimate = clicks * 0.02 * price * 0.3;

    return {
      product_id: row.product_id,
      product_name: row.name,
      slug: row.slug,
      clicks,
      views,
      ctr: Math.round(ctr * 100) / 100,
      epc: Math.round(epc * 100) / 100,
      revenue_estimate: Math.round(revenueEstimate * 100) / 100,
    };
  });
}

/**
 * Compteurs du tableau de bord pour un marché. « Aujourd'hui » = depuis minuit à Madrid (lib/analytics/period.ts), et non
 * plus minuit dans le fuseau du serveur. Un seul aller-retour (opf_dashboard_stats) une fois la migration appliquée.
 */
export async function getDashboardStats(market: Market): Promise<DashboardStats> {
  return loadDashboardStats(supabaseAdmin, market, startOfTodayIso());
}
