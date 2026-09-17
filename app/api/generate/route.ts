import { generateProductContent } from '@/lib/ai';
import { NextRequest } from 'next/server';

/**
 * POST /api/generate
 * Génère du contenu IA (titre, sous-titre, script TikTok, FAQ, etc.) pour un produit.
 * Utilisé par TikTokHub (regénération script) et la création de produit.
 *
 * Body: { name: string, description: string, price?: number }
 * Response: GeneratedContent
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, price } = body;

    if (!name || !description) {
      return Response.json(
        { error: 'name et description sont requis' },
        { status: 400 }
      );
    }

    const content = await generateProductContent(
      description,
      name,
      price ?? null
    );

    return Response.json(content);
  } catch (err) {
    console.error('[/api/generate] Error:', err);
    return Response.json(
      { error: 'Erreur lors de la génération du contenu' },
      { status: 500 }
    );
  }
}
