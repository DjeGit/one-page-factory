import { NextRequest, NextResponse } from 'next/server';
import { generateBlogDraft } from '@/lib/ai';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isValidMarket } from '@/lib/market';
import { aiErrorResponse, badRequest, readJsonObject, unauthorized } from '../../_lib/http';

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  try {
    const parsed = await readJsonObject(req);
    if ('response' in parsed) return parsed.response;
    const body = parsed.body;

    if (typeof body.subject !== 'string' || !body.subject.trim()) return badRequest('Le sujet est requis');
    if (body.subject.length > 500) return badRequest('Le sujet est trop long (500 caractères maximum)');
    const angle = typeof body.angle === 'string' ? body.angle.slice(0, 1000) : '';

    const hasAnyKey =
      process.env.GEMINI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY;

    if (!hasAnyKey) {
      return NextResponse.json(
        { error: 'Aucune clé API IA configurée (GEMINI_API_KEY, ANTHROPIC_API_KEY ou OPENAI_API_KEY)' },
        { status: 503 }
      );
    }

    const market = isValidMarket(body.market as string) ? (body.market as 'fr' | 'es' | 'uk') : 'fr';
    const draft = await generateBlogDraft(body.subject.trim(), angle, market);

    return NextResponse.json(draft);
  } catch (error) {
    return aiErrorResponse('POST /api/blog/generate', error);
  }
}
