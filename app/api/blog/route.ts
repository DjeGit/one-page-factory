import { NextRequest, NextResponse } from 'next/server';
import { getAllBlogPostsAdmin, createBlogPost } from '@/lib/blog';
import { slugifyBlogTitle } from '@/lib/slugify';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isValidMarket } from '@/lib/market';
import type { BlogPostFormData } from '@/types';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const posts = await getAllBlogPostsAdmin();
    return NextResponse.json(posts);
  } catch (error) {
    console.error('GET /api/blog error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();

    if (!body.title || !body.content) {
      return NextResponse.json({ error: 'Le titre et le contenu sont requis' }, { status: 400 });
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
      linked_product_ids: Array.isArray(body.linked_product_ids) ? body.linked_product_ids : [],
      author_name: body.author_name || '',
      meta_title: body.meta_title || '',
      meta_description: body.meta_description || '',
      generated_by_ai: !!body.generated_by_ai,
    };

    const { post, error } = await createBlogPost(form);
    if (!post) {
      return NextResponse.json({ error: error || 'Erreur lors de la création' }, { status: 500 });
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('POST /api/blog error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
