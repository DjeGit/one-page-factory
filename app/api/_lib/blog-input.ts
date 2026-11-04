/**
 * Lecture et validation du formulaire d'article de blog (création et modification
 * partageaient le même bloc recopié deux fois). Les listes sont bornées, les
 * identifiants vérifiés, le slug normalisé.
 */
import { isValidMarket } from '@/lib/market';
import { slugifyBlogTitle } from '@/lib/slugify';
import type { BlogPostFormData } from '@/types';
import { isUuid } from '@/lib/visitor-tracking';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function str(v: unknown, max: number): string | null {
  if (v === undefined || v === null || v === '') return '';
  return typeof v === 'string' && v.length <= max ? v : null;
}

export function parseBlogForm(body: Record<string, unknown>): { form: BlogPostFormData } | { error: string } {
  if (typeof body.title !== 'string' || !body.title.trim() || typeof body.content !== 'string' || !body.content.trim()) {
    return { error: 'Le titre et le contenu sont requis' };
  }
  if (body.title.length > 300) return { error: 'Le titre est trop long (300 caractères maximum)' };
  if (body.content.length > 500_000) return { error: "Le contenu de l'article est trop long" };

  const excerpt = str(body.excerpt, 2000);
  const cover = str(body.cover_image_url, 2000);
  const author = str(body.author_name, 200);
  const metaTitle = str(body.meta_title, 300);
  const metaDescription = str(body.meta_description, 500);
  if (excerpt === null || cover === null || author === null || metaTitle === null || metaDescription === null) {
    return { error: "Un champ texte est invalide ou trop long (résumé, image, auteur, titre ou description SEO)" };
  }

  // Slug fourni : normalisé (accents, espaces…) plutôt que refusé ; sinon dérivé du titre.
  let slug = typeof body.slug === 'string' && body.slug.trim() ? slugifyBlogTitle(body.slug) : slugifyBlogTitle(body.title);
  if (!slug || !SLUG_RE.test(slug)) return { error: "Impossible de déduire un slug valide : précisez-en un (lettres, chiffres et tirets)" };
  slug = slug.slice(0, 120);

  let tags: string[] = [];
  if (body.tags !== undefined && body.tags !== null) {
    if (!Array.isArray(body.tags) || body.tags.length > 30 || body.tags.some((t) => typeof t !== 'string' || t.length > 60)) {
      return { error: 'Tags invalides (30 maximum, 60 caractères chacun)' };
    }
    tags = body.tags as string[];
  }

  let linked: string[] = [];
  if (body.linked_product_ids !== undefined && body.linked_product_ids !== null) {
    if (!Array.isArray(body.linked_product_ids) || body.linked_product_ids.length > 50 || !body.linked_product_ids.every(isUuid)) {
      return { error: 'Produits liés invalides' };
    }
    linked = body.linked_product_ids as string[];
  }

  if (body.category_id && !isUuid(body.category_id)) return { error: 'Catégorie invalide' };

  return {
    form: {
      title: body.title.trim(),
      slug,
      market: isValidMarket(body.market as string) ? (body.market as BlogPostFormData['market']) : 'fr',
      excerpt,
      content: body.content,
      cover_image_url: cover,
      status: body.status === 'published' ? 'published' : 'draft',
      tags,
      category_id: (body.category_id as string) || null,
      linked_product_ids: linked,
      author_name: author,
      meta_title: metaTitle,
      meta_description: metaDescription,
      generated_by_ai: !!body.generated_by_ai,
    },
  };
}

export interface CategoryInput {
  slug: string;
  name_fr: string;
  name_es: string;
  name_uk: string;
  icon: string | null;
}

/** Slug + noms fr/es/uk d'une catégorie (catalogue ou blog). `partial` : champs facultatifs (modification). */
export function parseCategoryNames(
  body: Record<string, unknown>,
  partial: boolean,
): { data: Partial<CategoryInput> } | { error: string } {
  const data: Partial<CategoryInput> = {};
  for (const k of ['slug', 'name_fr', 'name_es', 'name_uk'] as const) {
    const v = body[k];
    if (v === undefined) {
      if (!partial) return { error: 'Le slug et les noms (fr/es/uk) sont requis' };
      continue;
    }
    if (typeof v !== 'string' || !v.trim()) return { error: 'Le slug et les noms (fr/es/uk) sont requis' };
    if (v.length > 120) return { error: `${k} est trop long (120 caractères maximum)` };
    data[k] = v.trim();
  }
  if (data.slug !== undefined && !SLUG_RE.test(data.slug)) {
    return { error: 'Slug invalide : minuscules, chiffres et tirets uniquement (ex. maison-jardin)' };
  }
  if ('icon' in body) {
    if (body.icon !== null && body.icon !== '' && (typeof body.icon !== 'string' || body.icon.length > 50)) return { error: 'Icône invalide' };
    data.icon = (body.icon as string) || null;
  }
  return { data };
}

/** Ordre d'affichage : entier 0..9999. undefined si absent. */
export function parseSortOrder(v: unknown): number | undefined | null {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 9999) return null;
  return n;
}

/** Couleur d'étiquette (texte libre court) : null si vide, undefined si invalide. */
export function parseColor(v: unknown): string | null | undefined {
  if (v === undefined || v === null || v === '') return null;
  return typeof v === 'string' && v.length <= 40 ? v : undefined;
}
