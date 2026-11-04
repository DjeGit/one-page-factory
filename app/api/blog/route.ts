import { NextRequest, NextResponse } from 'next/server';
import { getAllBlogPostsAdmin, createBlogPost } from '@/lib/blog';
import { clearTtlCache } from '@/lib/ttl-cache';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isValidMarket } from '@/lib/market';
import { badRequest, dbErrorResponse, readJsonObject, unauthorized } from '../_lib/http';
import { parseBlogForm } from '../_lib/blog-input';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  try {
    const marketParam = req.nextUrl.searchParams.get('market');
    const { posts, error: listError } = await getAllBlogPostsAdmin(isValidMarket(marketParam) ? marketParam : undefined);
    if (listError) return dbErrorResponse('GET /api/blog', listError);
    return NextResponse.json(posts);
  } catch (error) {
    console.error('GET /api/blog error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  try {
    const parsed = await readJsonObject(req);
    if ('response' in parsed) return parsed.response;
    const result = parseBlogForm(parsed.body);
    if ('error' in result) return badRequest(result.error);

    const { post, error } = await createBlogPost(result.form);
    if (!post) return dbErrorResponse('POST /api/blog', error || 'création impossible', 'Erreur lors de la création');

    clearTtlCache();
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('POST /api/blog error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
