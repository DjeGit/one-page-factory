import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Product, AnalyticsData, DashboardStats } from '@/types';
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

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
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getSupabaseAnonKey();
    _supabaseAdmin = createClient(getSupabaseUrl(), serviceKey, {
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
function hashIp(ip: string): string {
  return createHash('sha256').update(ip + process.env.ADMIN_SECRET || 'salt').digest('hex').slice(0, 16);
}

// Get IP from request
function getIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

// =====================
// Product operations
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
    .single();

  if (error || !data) return null;
  return data as Product;
}

export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Product[];
}

export async function createProduct(productData: Partial<Product>): Promise<Product | null> {
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
  const ip = getIp(req);
  const ipHash = hashIp(ip);
  const userAgent = req.headers.get('user-agent') || null;
  const referer = req.headers.get('referer') || null;

  await supabaseAdmin.from('clicks').insert({
    product_id: productId,
    ip_hash: ipHash,
    user_agent: userAgent,
    referer: referer,
  });
}

export async function trackPageView(productId: string, req: NextRequest): Promise<void> {
  const ip = getIp(req);
  const ipHash = hashIp(ip);
  const userAgent = req.headers.get('user-agent') || null;
  const referer = req.headers.get('referer') || null;

  await supabaseAdmin.from('page_views').insert({
    product_id: productId,
    ip_hash: ipHash,
    user_agent: userAgent,
    referer: referer,
  });
}

export async function getAnalytics(productId?: string): Promise<AnalyticsData[]> {
  // Get all products
  const productsQuery = supabaseAdmin.from('products').select('id, name, slug, price');
  if (productId) {
    productsQuery.eq('id', productId);
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
    // Estimate EPC: assume 2% conversion and 30% commission
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

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [
    { count: totalProducts },
    { count: activeProducts },
    { count: clicksToday },
    { count: viewsToday },
    { count: totalClicks },
    { count: totalViews },
  ] = await Promise.all([
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('active', true),
    supabaseAdmin.from('clicks').select('*', { count: 'exact', head: true }).gte('clicked_at', todayIso),
    supabaseAdmin.from('page_views').select('*', { count: 'exact', head: true }).gte('viewed_at', todayIso),
    supabaseAdmin.from('clicks').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('page_views').select('*', { count: 'exact', head: true }),
  ]);

  return {
    total_products: totalProducts || 0,
    active_products: activeProducts || 0,
    clicks_today: clicksToday || 0,
    views_today: viewsToday || 0,
    total_clicks: totalClicks || 0,
    total_views: totalViews || 0,
  };
}
