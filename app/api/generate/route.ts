import { NextRequest, NextResponse } from 'next/server';
import { generateProductContent } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.description || !body.name) {
      return NextResponse.json(
        { error: 'Le nom et la description sont requis' },
        { status: 400 }
      );
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

    const content = await generateProductContent(
      body.description,
      body.name,
      body.price,
      body.market || 'fr'
    );

    return NextResponse.json(content);
  } catch (error) {
    console.error('POST /api/generate error:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
