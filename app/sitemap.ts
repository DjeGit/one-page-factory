import { getSupabaseAdmin } from '@/lib/supabase';
import type { MetadataRoute } from 'next';

// Sans ce `revalidate`, Next.js générait ce sitemap UNE SEULE FOIS au build
// (route statique par défaut) — d'où un sitemap.xml figé à la date du
// dernier déploiement, sans aucune des pages produit créées depuis (audit
// du 22/09). Régénéré au plus une fois par heure désormais, ce qui reste
// largement suffisant pour un crawl moteur de recherche.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = getSupabaseAdmin();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tendpick.com').replace(/\/$/, '');

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

  // Blog (04/10, chantier "Blog + Vente directe") : uniquement les
  // articles publiés, tous marchés confondus (le sitemap n'a pas de
  // notion de marché, comme pour les produits ci-dessus).
  const { data: posts } = await sb
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('status', 'published');

  const blogUrls: MetadataRoute.Sitemap = (posts || []).map((p) => ({
    url: `${siteUrl}/blog/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [
    // Pages publiques principales
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/produits`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    // Landing pages produits
    ...productUrls,
    // Articles de blog
    ...blogUrls,
    // Pages légales
    { url: `${siteUrl}/mentions-legales`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.1 },
    { url: `${siteUrl}/politique-confidentialite`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.1 },
  ];
}
