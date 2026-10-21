import { headers } from 'next/headers';
import type { MetadataRoute } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase';
import { GUIDE_BASE_PATH, GUIDE_CATEGORY_SLUG, GUIDE_PILLAR_SLUG } from '@/lib/buying-guide';
import { getRequestHost, getRequestMarket, getRequestOrigin, isBackofficeHost } from '@/lib/site-url';

// Audit SEO du 07/10 (C4, E4) : le sitemap listait tous les marchés sous
// tendpick.com, oubliait /c/* et /top-ventes, inscrivait les pages légales
// en noindex et datait chaque URL « maintenant » (ce qui retire toute
// valeur au champ lastmod). Désormais :
//   - une réponse par domaine, limitée aux contenus de SON marché ;
//   - catégories incluses seulement si elles contiennent au moins un produit
//     (une page vide ne doit pas être poussée à Google) ;
//   - lastmod = vraie date de dernière modification du contenu ;
//   - pagination des requêtes (PostgREST plafonne à 1000 lignes par appel).
// Lit les en-têtes de la requête : dynamique, régénéré à chaque appel de bot.
export const dynamic = 'force-dynamic';

const PAGE = 1000;
const MAX_ROWS = 45000; // limite sitemap : 50 000 URL, marge pour les pages fixes

type Row = Record<string, unknown>;

async function fetchAll(build: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: unknown }>): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error || !data) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

function latest(dates: Array<string | undefined | null>): Date | undefined {
  const times = dates.filter(Boolean).map((d) => new Date(d as string).getTime()).filter((n) => !Number.isNaN(n));
  return times.length ? new Date(Math.max(...times)) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = headers();
  // Le back-office n'a pas de sitemap utile (robots.txt interdit tout).
  if (isBackofficeHost(getRequestHost(h))) return [];

  const origin = getRequestOrigin(h);
  const market = getRequestMarket(h);

  let products: Row[] = [];
  let posts: Row[] = [];
  let categories: Row[] = [];
  let guideCategoryId: string | null = null;
  try {
    const sb = getSupabaseAdmin();
    [products, posts, categories] = await Promise.all([
      fetchAll((from, to) =>
        sb.from('products').select('slug, category_id, updated_at').eq('active', true).eq('market', market).range(from, to)
      ),
      fetchAll((from, to) =>
        sb.from('blog_posts').select('slug, updated_at, category_id').eq('status', 'published').eq('market', market).range(from, to)
      ),
      fetchAll((from, to) => sb.from('categories').select('id, slug, is_active, active_markets').range(from, to)),
    ]);
    const { data: gc } = await sb.from('blog_categories').select('id').eq('slug', GUIDE_CATEGORY_SLUG).maybeSingle();
    guideCategoryId = (gc?.id as string | undefined) ?? null;
  } catch {
    // Base injoignable : on sert au moins les pages fixes plutôt qu'une erreur 500.
  }

  const productUrls: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${origin}/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at as string) : undefined,
  }));

  // Les guides d'achat vivent sous /guide-achat (le guide pilier = /guide-achat).
  const isGuide = (p: Row) => guideCategoryId !== null && p.category_id === guideCategoryId;
  const blogPosts = posts.filter((p) => !isGuide(p));
  const guidePosts = posts.filter(isGuide);
  const pillarSlug = GUIDE_PILLAR_SLUG[market];

  const blogUrls: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${origin}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at as string) : undefined,
  }));

  const guideUrls: MetadataRoute.Sitemap = guidePosts.map((p) => ({
    url: p.slug === pillarSlug ? `${origin}${GUIDE_BASE_PATH}` : `${origin}${GUIDE_BASE_PATH}/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at as string) : undefined,
  }));

  // Catégories : uniquement celles qui ont au moins un produit sur ce marché.
  const categoryUrls: MetadataRoute.Sitemap = categories
    .filter((c) =>
      Array.isArray(c.active_markets) ? (c.active_markets as string[]).includes(market) : Boolean(c.is_active)
    )
    .map((c) => {
      const inCategory = products.filter((p) => p.category_id === c.id);
      if (inCategory.length === 0) return null;
      return {
        url: `${origin}/c/${c.slug}`,
        lastModified: latest(inCategory.map((p) => p.updated_at as string)),
      };
    })
    .filter((x): x is { url: string; lastModified: Date | undefined } => x !== null);

  const lastProducts = latest(products.map((p) => p.updated_at as string));
  const lastPosts = latest(blogPosts.map((p) => p.updated_at as string));

  const fixed: MetadataRoute.Sitemap = [
    { url: origin, lastModified: latest([lastProducts?.toISOString(), lastPosts?.toISOString()]) },
    { url: `${origin}/produits`, lastModified: lastProducts },
    { url: `${origin}/top-ventes`, lastModified: lastProducts },
  ];
  // Pages de confiance (18/10) : identiques sur les trois domaines, langue du
  // marché, indexables — contrairement aux pages légales en noindex.
  for (const path of ['/a-propos', '/methode', '/contact', '/partenariats']) {
    fixed.push({ url: `${origin}${path}` });
  }

  // /blog seulement s'il y a au moins un article publié sur ce marché.
  if (blogPosts.length > 0) fixed.push({ url: `${origin}/blog`, lastModified: lastPosts });

  // Pages légales volontairement absentes : elles sont en noindex.
  return [...fixed, ...categoryUrls, ...productUrls, ...guideUrls, ...blogUrls];
}
