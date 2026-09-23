import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Category, Product, AnalyticsData, DashboardStats } from '@/types';
import type { Market } from '@/lib/market';
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { isBotUserAgent } from '@/lib/bot-detection';

// Lazy singleton clients — created on first use so env vars are available
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

// Public client (for client-side operations)
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  return _supabase;
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
      console.error(
        '[supabase] SUPABASE_SERVICE_ROLE_KEY absente — repli sur la clé anon, RLS va bloquer la quasi-totalité des opérations admin.'
      );
    }
    _supabaseAdmin = createClient(getSupabaseUrl(), serviceKey || getSupabaseAnonKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}

// Backwards-compat named exports (lazy proxies)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

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
function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.ADMIN_SECRET || 'salt')).digest('hex').slice(0, 16);
}

// Get IP from request
function getIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
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
    .single();

  if (error || !data) return null;
  return data as Product;
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as Product;
}

export async function getProductByCode(code: string): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('redirect_code', code)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) return null;
  return data as Product;
}

// market omis = tous marchés confondus (utilisé par les pages PUBLIQUES,
// ex. app/bio/page.tsx, qui n'ont pas de notion de marché admin actif).
// Les pages/routes ADMIN doivent toujours passer explicitement
// getActiveMarket().
export async function getAllProducts(market?: Market): Promise<Product[]> {
  let query = supabaseAdmin.from('products').select('*').order('created_at', { ascending: false });
  if (market) query = query.eq('market', market);
  const { data, error } = await query;

  if (error || !data) return [];
  return data as Product[];
}

// Categories (23/09) — liste complete triee par sort_order, utilisee par
// l'admin (formulaire produit) et par la nav publique.
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error || !data) return [];
  return data as Category[];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;
  return data as Category;
}

// Produits actifs d'une categorie pour un marche donne — page publique
// /c/[slug].
export async function getActiveProductsByCategory(categoryId: string, market: Market): Promise<Product[]> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('category_id', categoryId)
    .eq('market', market)
    .eq('active', true)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];
  return data as Product[];
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
  return true;
}

export async function createProduct(productData: Partial<Product> & { market: Market }): Promise<Product | null> {
  // Ensure slug is unique
  let slug = productData.slug || generateSlug(productData.name || '');
  const { data: existing } = await supabaseAdmin
    .from('products')
    .select('slug')
    .eq('slug', slug)
    .single();

  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({
      ...productData,
      slug,
      pain_points: productData.pain_points || [],
      benefits: productData.benefits || [],
      faq: productData.faq || [],
      testimonials: productData.testimonials || [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating product:', error);
    return null;
  }
  return data as Product;
}

export async function updateProduct(id: string, productData: Partial<Product>): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .update(productData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating product:', error);
    return null;
  }
  return data as Product;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting product:', error);
    return false;
  }
  return true;
}

// =====================
// Analytics operations
// =====================

export async function trackClick(productId: string, req: NextRequest): Promise<void> {
  const userAgent = req.headers.get('user-agent') || null;
  // Sprint 5 : un bot qui suit un lien /go/[code] (link-checker, crawler
  // SEO) ne représente pas une intention d'achat — on ne le compte pas.
  if (isBotUserAgent(userAgent)) return;

  const ip = getIp(req);
  const ipHash = hashIp(ip);
  const referer = req.headers.get('referer') || null;

  await supabaseAdmin.from('clicks').insert({
    product_id: productId,
    ip_hash: ipHash,
    user_agent: userAgent,
    referer: referer,
  });
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

  const ip = getIp(req);
  const ipHash = hashIp(ip);
  const referer = req.headers.get('referer') || null;

  await supabaseAdmin
    .from('page_views')
    .upsert(
      { product_id: productId, ip_hash: ipHash, user_agent: userAgent, referer: referer },
      { onConflict: 'product_id,ip_hash,viewed_date', ignoreDuplicates: true }
    );
}

// market omis = agrégat tous marchés (compat pages publiques / anciens
// appels). Les vues admin doivent passer explicitement getActiveMarket().
export async function getAnalytics(market?: Market, productId?: string): Promise<AnalyticsData[]> {
  let productsQuery = supabaseAdmin.from('products').select('id, name, slug, price');
  if (market) productsQuery = productsQuery.eq('market', market);
  if (productId) {
    productsQuery = productsQuery.eq('id', productId);
  }
  const { data: products } = await productsQuery;
  if (!products) return [];

  const results: AnalyticsData[] = [];

  for (const product of products) {
    // Get click count
    const { count: clickCount } = await supabaseAdmin
      .from('clicks')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', product.id);

    // Get view count
    const { count: viewCount } = await supabaseAdmin
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', product.id);

    const clicks = clickCount || 0;
    const views = viewCount || 0;
    const ctr = views > 0 ? (clicks / views) * 100 : 0;
    const price = (product as any).price || 0;
    // Estimate EPC: assume 2% conversion et 30% commission
    // (remplacé par lib/analytics/roi.ts au Sprint 5 — conservé ici pour compat le temps de la transition)
    const epc = clicks > 0 ? (clicks * 0.02 * price * 0.3) / clicks : 0;
    const revenueEstimate = clicks * 0.02 * price * 0.3;

    results.push({
      product_id: product.id,
      product_name: product.name,
      slug: product.slug,
      clicks,
      views,
      ctr: Math.round(ctr * 100) / 100,
      epc: Math.round(epc * 100) / 100,
      revenue_estimate: Math.round(revenueEstimate * 100) / 100,
    });
  }

  return results;
}

export async function getDashboardStats(market: Market): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  // Le champ market ne vit que sur products : on récupère d'abord les ids
  // de produits du marché actif, puis on filtre clicks/page_views dessus.
  const { data: marketProducts } = await supabaseAdmin
    .from('products')
    .select('id, active')
    .eq('market', market);

  const productIds = (marketProducts || []).map((p) => p.id);
  const activeIds = (marketProducts || []).filter((p) => p.active).map((p) => p.id);

  if (productIds.length === 0) {
    return {
      total_products: 0,
      active_products: 0,
      clicks_today: 0,
      views_today: 0,
      total_clicks: 0,
      total_views: 0,
    };
  }

  const [
    { count: clicksToday },
    { count: viewsToday },
    { count: totalClicks },
    { count: totalViews },
  ] = await Promise.all([
    supabaseAdmin.from('clicks').select('*', { count: 'exact', head: true }).in('product_id', productIds).gte('clicked_at', todayIso),
    supabaseAdmin.from('page_views').select('*', { count: 'exact', head: true }).in('product_id', productIds).gte('viewed_at', todayIso),
    supabaseAdmin.from('clicks').select('*', { count: 'exact', head: true }).in('product_id', productIds),
    supabaseAdmin.from('page_views').select('*', { count: 'exact', head: true }).in('product_id', productIds),
  ]);

  return {
    total_products: productIds.length,
    active_products: activeIds.length,
    clicks_today: clicksToday || 0,
    views_today: viewsToday || 0,
    total_clicks: totalClicks || 0,
    total_views: totalViews || 0,
  };
}
