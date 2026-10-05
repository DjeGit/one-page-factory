/**
 * Slugification pure, sans dépendance — utilisable aussi bien côté
 * serveur (lib/blog.ts) que côté client (BlogPostForm.tsx, auto-slug à la
 * saisie du titre). Volontairement séparé de lib/blog.ts qui, lui,
 * importe lib/supabase (admin client) : un composant 'use client' ne doit
 * jamais tirer ce genre de module serveur dans son bundle.
 */
export function slugifyBlogTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
