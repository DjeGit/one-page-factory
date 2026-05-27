import { getSupabaseAdmin } from '@/lib/supabase';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = getSupabaseAdmin();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const { data: products } = await sb
    .from('products')
    .select('slug, updated_at')
    .eq('active', true);

  const productUrls: MetadataRoute.Sitemap = (products || []).map((p) => ({
    url: `${siteUrl}/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...productUrls,
  ];
}
