import { NextRequest, NextResponse } from 'next/server';
import { generateProductContent } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.description || !body.name) {
      return NextResponse.json(
        { error: 'Le nom et la description sont requis' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Clé API OpenAI non configurée' },
        { status: 503 }
      );
    }

    const content = await generateProductContent(
      body.description,
      body.name,
      body.price
    );

    return NextResponse.json(content);
  } catch (error) {
    console.error('POST /api/generate error:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
