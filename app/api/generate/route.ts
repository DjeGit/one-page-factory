import { NextRequest, NextResponse } from 'next/server';
import { generateProductContent } from '@/lib/ai';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isValidMarket } from '@/lib/market';
import { aiErrorResponse, badRequest, readJsonObject, unauthorized } from '../_lib/http';

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  try {
    const parsed = await readJsonObject(req);
    if ('response' in parsed) return parsed.response;
    const body = parsed.body;

    if (typeof body.description !== 'string' || !body.description.trim() || typeof body.name !== 'string' || !body.name.trim()) {
      return badRequest('Le nom et la description sont requis');
    }
    if (body.name.length > 300 || body.description.length > 10000) {
      return badRequest('Le nom ou la description est trop long');
    }
    // Avant : un marché inconnu partait tel quel dans le prompt.
    if (body.market !== undefined && body.market !== null && body.market !== '' && !isValidMarket(body.market as string)) {
      return badRequest('Marché invalide (fr, es ou uk)');
    }
    // Le prix n'est qu'une indication pour le texte : un prix illisible (« 19,9 € ») est ignoré, il ne bloque pas la génération.
    const rawPrice = typeof body.price === 'string' ? Number(body.price.replace(',', '.')) : Number(body.price);
    const price = body.price != null && body.price !== '' && Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : null;

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
      price,
      (body.market as 'fr' | 'es' | 'uk') || 'fr'
    );

    return NextResponse.json(content);
  } catch (error) {
    return aiErrorResponse('POST /api/generate', error);
  }
}
