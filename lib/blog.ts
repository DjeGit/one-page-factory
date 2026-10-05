/**
 * Blog editorial — Sprint 1 du chantier "Blog + Vente directe" (04/10).
 * Getters publics (homepage, /blog, /blog/[slug]) + CRUD admin, meme
 * style que lib/supabase.ts (getAllProducts, getActiveCategories, ...).
 * Toujours via getSupabaseAdmin() : RLS bloque la cle anon sur
 * blog_posts (service_role only), comme le reste du schema.
 */
import { getSupabaseAdmin } from '@/lib/supabase';
import type { BlogPost, BlogPostFormData } from '@/types';
import type { Market } from '@/lib/market';
export { slugifyBlogTitle } from '@/lib/slugify';

interface GetPublishedOptions {
  tag?: string;
}

/** Articles publies d'un marche, les plus recents d'abord. Filtre optionnel par tag. */
export async function getPublishedBlogPosts(market: Market, options: GetPublishedOptions = {}): Promise<BlogPost[]> {
  const sb = getSupabaseAdmin();
  let query = sb
    .from('blog_posts')
    .select('*')
    .eq('market', market)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (options.tag) {
    query = query.contains('tags', [options.tag]);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as BlogPost[];
}

/** Les N derniers articles publies — utilise par la section "Depuis le blog" de l'accueil. */
export async function getLatestPublishedBlogPosts(market: Market, limit: number): Promise<BlogPost[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('blog_posts')
    .select('*')
    .eq('market', market)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as BlogPost[];
}

/**
 * Un article publie par son slug. Ne renvoie jamais un brouillon — la
 * page publique /blog/[slug] doit faire un notFound() si null, jamais
 * afficher un contenu non publie meme avec le lien direct.
 */
export async function getPublishedBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !data) return null;
  return data as BlogPost;
}

/** Admin uniquement : un article quel que soit son statut (ecran d'edition). */
export async function getBlogPostByIdAdmin(id: string): Promise<BlogPost | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as BlogPost;
}

/** Admin uniquement : tous les articles (brouillons + publies), plus recents d'abord. */
export async function getAllBlogPostsAdmin(): Promise<BlogPost[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('blog_posts').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as BlogPost[];
}

function toInsertPayload(form: BlogPostFormData) {
  return {
    slug: form.slug,
    market: form.market,
    title: form.title,
    excerpt: form.excerpt || null,
    content: form.content,
    cover_image_url: form.cover_image_url || null,
    status: form.status,
    tags: form.tags,
    linked_product_ids: form.linked_product_ids,
    author_name: form.author_name || null,
    meta_title: form.meta_title || null,
    meta_description: form.meta_description || null,
    generated_by_ai: form.generated_by_ai,
    // published_at fixe a maintenant uniquement si on cree directement en
    // statut publie (cas rare depuis l'admin) — le chemin normal
    // brouillon -> publie passe par publishBlogPost() ci-dessous.
    published_at: form.status === 'published' ? new Date().toISOString() : null,
  };
}

export async function createBlogPost(form: BlogPostFormData): Promise<{ post: BlogPost | null; error: string | null }> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('blog_posts').insert(toInsertPayload(form)).select('*').single();
  if (error || !data) return { post: null, error: error?.message || 'Erreur inconnue' };
  return { post: data as BlogPost, error: null };
}

export async function updateBlogPost(
  id: string,
  form: BlogPostFormData
): Promise<{ post: BlogPost | null; error: string | null }> {
  const sb = getSupabaseAdmin();
  // On ne touche jamais published_at ici si l'article est deja publie —
  // seule publishBlogPost() fixe cette date, pour ne pas la rafraichir a
  // chaque correction mineure d'un article deja en ligne.
  const existing = await getBlogPostByIdAdmin(id);
  const payload = toInsertPayload(form);
  if (existing?.status === 'published' && form.status === 'published') {
    payload.published_at = existing.published_at;
  }
  const { data, error } = await sb.from('blog_posts').update(payload).eq('id', id).select('*').single();
  if (error || !data) return { post: null, error: error?.message || 'Erreur inconnue' };
  return { post: data as BlogPost, error: null };
}

/** Bascule un brouillon en publie et fixe published_at a maintenant. */
export async function publishBlogPost(id: string): Promise<{ post: BlogPost | null; error: string | null }> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('blog_posts')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) return { post: null, error: error?.message || 'Erreur inconnue' };
  return { post: data as BlogPost, error: null };
}

export async function deleteBlogPost(id: string): Promise<{ error: string | null }> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from('blog_posts').delete().eq('id', id);
  return { error: error?.message || null };
}
