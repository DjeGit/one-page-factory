import { NextRequest, NextResponse } from 'next/server';
import { getBlogPostByIdAdmin, updateBlogPost, deleteBlogPost, publishBlogPost } from '@/lib/blog';
import { slugifyBlogTitle } from '@/lib/slugify';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isValidMarket } from '@/lib/market';
import type { BlogPostFormData } from '@/types';

interface Params {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const post = await getBlogPostByIdAdmin(params.id);
  if (!post) return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
  return NextResponse.json(post);
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();

    if (!body.title || !body.content) {
      return NextResponse.json({ error: 'Le titre et le contenu sont requis' }, { status: 400 });
    }

    // Publication explicite demandée depuis l'admin (ex: bouton "Publier"
    // sans repasser par tout le formulaire) : { publish: true } seul.
    if (body.publish === true && Object.keys(body).length === 1) {
      const { post, error } = await publishBlogPost(params.id);
      if (!post) return NextResponse.json({ error: error || 'Erreur lors de la publication' }, { status: 500 });
      return NextResponse.json(post);
    }

    const form: BlogPostFormData = {
      title: body.title,
      slug: body.slug || slugifyBlogTitle(body.title),
      market: isValidMarket(body.market) ? body.market : 'fr',
      excerpt: body.excerpt || '',
      content: body.content,
      cover_image_url: body.cover_image_url || '',
      status: body.status === 'published' ? 'published' : 'draft',
      tags: Array.isArray(body.tags) ? body.tags : [],
      category_id: body.category_id || null,
      linked_product_ids: Array.isArray(body.linked_product_ids) ? body.linked_product_ids : [],
      author_name: body.author_name || '',
      meta_title: body.meta_title || '',
      meta_description: body.meta_description || '',
      generated_by_ai: !!body.generated_by_ai,
    };

    const { post, error } = await updateBlogPost(params.id, form);
    if (!post) {
      return NextResponse.json({ error: error || 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error(`PUT /api/blog/${params.id} error:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { error } = await deleteBlogPost(params.id);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
