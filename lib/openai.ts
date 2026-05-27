import OpenAI from 'openai';
import type { GeneratedContent } from '@/types';

function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'placeholder',
  });
}

export async function generateProductContent(
  productDescription: string,
  productName: string,
  price?: number | null
): Promise<GeneratedContent> {
  const priceContext = price ? `Le produit coûte ${price}€.` : '';

  const prompt = `Tu es un expert en copywriting de conversion et en marketing d'affiliation.
Génère du contenu marketing percutant en français pour la page de vente suivante.

Produit : ${productName}
Description : ${productDescription}
${priceContext}

Génère un JSON avec exactement cette structure (tout en français) :

{
  "hero_title": "Titre accrocheur et percutant (max 80 caractères), en gras, qui parle directement au problème du client",
  "hero_subtitle": "Sous-titre qui explique la transformation promise (1-2 phrases max)",
  "pain_points": [
    {
      "emoji": "😩",
      "title": "Le problème en 5 mots",
      "description": "Description courte du problème ressenti (1 phrase)"
    },
    {
      "emoji": "😤",
      "title": "Deuxième problème",
      "description": "Description courte"
    },
    {
      "emoji": "😰",
      "title": "Troisième problème",
      "description": "Description courte"
    }
  ],
  "benefits": [
    {
      "icon": "✅",
      "title": "Bénéfice principal en 5 mots",
      "description": "Explication courte du bénéfice (1 phrase)"
    },
    {
      "icon": "⚡",
      "title": "Deuxième bénéfice",
      "description": "Explication courte"
    },
    {
      "icon": "🎯",
      "title": "Troisième bénéfice",
      "description": "Explication courte"
    },
    {
      "icon": "💪",
      "title": "Quatrième bénéfice",
      "description": "Explication courte"
    },
    {
      "icon": "🔥",
      "title": "Cinquième bénéfice",
      "description": "Explication courte"
    }
  ],
  "faq": [
    {
      "question": "Question fréquente 1 ?",
      "answer": "Réponse rassurante et complète (2-3 phrases)"
    },
    {
      "question": "Question fréquente 2 ?",
      "answer": "Réponse"
    },
    {
      "question": "Est-ce que ça marche vraiment ?",
      "answer": "Réponse qui lève les doutes"
    },
    {
      "question": "Combien de temps avant de voir des résultats ?",
      "answer": "Réponse réaliste et encourageante"
    },
    {
      "question": "Et si ça ne me convient pas ?",
      "answer": "Réponse sur la garantie et le service client"
    }
  ],
  "tiktok_script": "Script TikTok court et viral (30 secondes max) : Hook + Problème + Solution + CTA. Commence par une phrase choc.",
  "testimonials": [
    {
      "name": "Marie L.",
      "location": "Lyon",
      "rating": 5,
      "text": "Témoignage réaliste et enthousiaste (2-3 phrases) avec des détails spécifiques",
      "date": "il y a 3 jours"
    },
    {
      "name": "Thomas B.",
      "location": "Paris",
      "rating": 5,
      "text": "Témoignage différent avec d'autres bénéfices mentionnés",
      "date": "il y a 1 semaine"
    },
    {
      "name": "Sophie M.",
      "location": "Bordeaux",
      "rating": 5,
      "text": "Témoignage d'une personne sceptique au départ qui a été convaincue",
      "date": "il y a 2 semaines"
    }
  ],
  "meta_title": "Titre SEO optimisé (max 60 caractères)",
  "meta_description": "Description meta pour le SEO (max 155 caractères), avec call-to-action"
}

IMPORTANT: Retourne uniquement le JSON valide, sans markdown ni texte supplémentaire.`;

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Tu es un expert en copywriting de marketing direct. Tu génères uniquement du JSON valide, sans aucun formatage markdown.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.8,
    max_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content generated from OpenAI');
  }

  const parsed = JSON.parse(content) as GeneratedContent;

  // Validate and set defaults
  return {
    hero_title: parsed.hero_title || `Découvrez ${productName}`,
    hero_subtitle: parsed.hero_subtitle || productDescription,
    pain_points: Array.isArray(parsed.pain_points) ? parsed.pain_points.slice(0, 3) : [],
    benefits: Array.isArray(parsed.benefits) ? parsed.benefits.slice(0, 6) : [],
    faq: Array.isArray(parsed.faq) ? parsed.faq.slice(0, 5) : [],
    tiktok_script: parsed.tiktok_script || '',
    testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials.slice(0, 3) : [],
    meta_title: parsed.meta_title || productName,
    meta_description: parsed.meta_description || productDescription,
  };
}
