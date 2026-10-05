import { NextRequest, NextResponse } from 'next/server';
import { generateBlogDraft } from '@/lib/ai';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isValidMarket } from '@/lib/market';

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();

    if (!body.subject) {
      return NextResponse.json({ error: 'Le sujet est requis' }, { status: 400 });
    }

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

    const market = isValidMarket(body.market) ? body.market : 'fr';
    const draft = await generateBlogDraft(body.subject, body.angle || '', market);

    return NextResponse.json(draft);
  } catch (error) {
    console.error('POST /api/blog/generate error:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
