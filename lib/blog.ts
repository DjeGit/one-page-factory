/**
 * Blog editorial — Sprint 1 du chantier "Blog + Vente directe" (04/10),
 * categories ajoutees le 05/10 (demande Jerome). Getters publics
 * (homepage, /blog, /blog/[slug]) + CRUD admin, meme style que
 * lib/supabase.ts (getAllProducts, getActiveCategories, ...). Toujours
 * via getSupabaseAdmin() : RLS bloque la cle anon sur blog_posts et
 * blog_categories (service_role only), comme le reste du schema.
 */
import { getSupabaseAdmin } from '@/lib/supabase';
import type { BlogPost, BlogPostFormData, BlogCategory } from '@/types';
import type { Market } from '@/lib/market';
export { slugifyBlogTitle } from '@/lib/slugify';

// Jointure systematique sur la categorie — un article affiche presque
// toujours son badge de categorie (liste, article, admin), plus simple
// d'inclure partout que de la refaire au cas par cas.
const POST_SELECT = '*, category:blog_categories(*)';

interface GetPublishedOptions {
  tag?: string;
  categorySlug?: string;
}

/** Articles publies d'un marche, les plus recents d'abord. Filtres optionnels par tag et/ou categorie. */
export async function getPublishedBlogPosts(market: Market, options: GetPublishedOptions = {}): Promise<BlogPost[]> {
  const sb = getSupabaseAdmin();
  let query = sb
    .from('blog_posts')
    .select(POST_SELECT)
    .eq('market', market)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (options.tag) {
    query = query.contains('tags', [options.tag]);
  }
  if (options.categorySlug) {
    const category = await getBlogCategoryBySlug(options.categorySlug);
    // Slug inconnu -> aucun resultat plutot que d'ignorer le filtre
    // silencieusement (un lien de categorie casse ne doit pas afficher
    // "tous les articles" par erreur).
    query = query.eq('category_id', category?.id || '00000000-0000-0000-0000-000000000000');
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as BlogPost[];
}

/** Les N derniers articles publies — utilise par la section "Depuis le blog" de l'accueil. */
export async function getLatestPublishedBlogPosts(market: Market, limit: number): Promise<BlogPost[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('blog_posts')
    .select(POST_SELECT)
    .eq('market', market)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as BlogPost[];
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
    .select(POST_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as BlogPost;
}

/** Admin uniquement : un article quel que soit son statut (ecran d'edition). */
export async function getBlogPostByIdAdmin(id: string): Promise<BlogPost | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('blog_posts').select(POST_SELECT).eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as unknown as BlogPost;
}

/** Admin uniquement : tous les articles (brouillons + publies), plus recents d'abord. */
export async function getAllBlogPostsAdmin(): Promise<BlogPost[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('blog_posts').select(POST_SELECT).order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as unknown as BlogPost[];
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
    category_id: form.category_id || null,
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
  const { data, error } = await sb.from('blog_posts').insert(toInsertPayload(form)).select(POST_SELECT).single();
  if (error || !data) return { post: null, error: error?.message || 'Erreur inconnue' };
  return { post: data as unknown as BlogPost, error: null };
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
  const { data, error } = await sb.from('blog_posts').update(payload).eq('id', id).select(POST_SELECT).single();
  if (error || !data) return { post: null, error: error?.message || 'Erreur inconnue' };
  return { post: data as unknown as BlogPost, error: null };
}

/** Bascule un brouillon en publie et fixe published_at a maintenant. */
export async function publishBlogPost(id: string): Promise<{ post: BlogPost | null; error: string | null }> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('blog_posts')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .select(POST_SELECT)
    .single();
  if (error || !data) return { post: null, error: error?.message || 'Erreur inconnue' };
  return { post: data as unknown as BlogPost, error: null };
}

export async function deleteBlogPost(id: string): Promise<{ error: string | null }> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from('blog_posts').delete().eq('id', id);
  return { error: error?.message || null };
}

// ─── Categories de blog (05/10) ──────────────────────────────────────────────

/** Toutes les categories de blog, triees pour l'affichage (admin + public). */
export async function getBlogCategories(): Promise<BlogCategory[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('blog_categories').select('*').order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data as BlogCategory[];
}

export async function getBlogCategoryBySlug(slug: string): Promise<BlogCategory | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('blog_categories').select('*').eq('slug', slug).maybeSingle();
  if (error || !data) return null;
  return data as BlogCategory;
}

export interface BlogCategoryInput {
  slug: string;
  name_fr: string;
  name_es: string;
  name_uk: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
}

export async function createBlogCategory(input: BlogCategoryInput): Promise<{ category: BlogCategory | null; error: string | null }> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('blog_categories').insert(input).select('*').single();
  if (error || !data) return { category: null, error: error?.message || 'Erreur inconnue' };
  return { category: data as BlogCategory, error: null };
}

export async function updateBlogCategory(
  id: string,
  input: BlogCategoryInput
): Promise<{ category: BlogCategory | null; error: string | null }> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('blog_categories').update(input).eq('id', id).select('*').single();
  if (error || !data) return { category: null, error: error?.message || 'Erreur inconnue' };
  return { category: data as BlogCategory, error: null };
}

/**
 * Supprime une categorie. Les articles qui la referencaient repassent a
 * category_id = NULL (ON DELETE SET NULL, migration) — jamais supprimes
 * avec elle.
 */
export async function deleteBlogCategory(id: string): Promise<{ error: string | null }> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from('blog_categories').delete().eq('id', id);
  return { error: error?.message || null };
}
