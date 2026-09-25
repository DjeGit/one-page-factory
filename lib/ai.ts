/**
 * AI Provider — Multi-provider content generation
 * Priority: Gemini 2.5 Flash → Claude Sonnet → OpenAI (fallback)
 *
 * Gemini uses Google's OpenAI-compatible endpoint (no extra package needed).
 * Claude uses Anthropic's OpenAI-compatible endpoint.
 */
import OpenAI from 'openai';
import type { GeneratedContent } from '@/types';
import type { Market } from '@/lib/market';

// ─── Shared prompt ───────────────────────────────────────────────────────────

// Langue et repères culturels par marché — corrige le bug où tout le
// contenu genere (y compris pour .es et le marche anglophone) sortait
// systematiquement en francais avec des temoignages "Marie L., Lyon"
// quel que soit le marche du produit (trouve le 23/09/2026).
const LANGUAGE_LABELS: Record<Market, string> = {
  fr: 'français',
  es: 'espagnol (español, castillan)',
  uk: 'anglais (English, ton UK/international)',
};

const TESTIMONIAL_LOCALES: Record<Market, { name: string; location: string }[]> = {
  fr: [
    { name: 'Marie L.', location: 'Lyon' },
    { name: 'Thomas B.', location: 'Paris' },
    { name: 'Sophie M.', location: 'Bordeaux' },
  ],
  es: [
    { name: 'María L.', location: 'Madrid' },
    { name: 'Carlos B.', location: 'Barcelona' },
    { name: 'Sofía M.', location: 'Valencia' },
  ],
  uk: [
    { name: 'Emma L.', location: 'London' },
    { name: 'James B.', location: 'Manchester' },
    { name: 'Sophie M.', location: 'Bristol' },
  ],
};

// Fallback du titre hero quand le parsing JSON de la reponse IA echoue
// (parseAndValidate, strategie 3) - avant ce correctif ce texte etait
// toujours "Decouvrez {nom}" en dur, meme pour les marches ES/UK.
const HERO_FALLBACK_PREFIX: Record<Market, string> = {
  fr: 'Découvrez',
  es: 'Descubre',
  uk: 'Discover',
};

export function buildContentPrompt(
  productName: string,
  productDescription: string,
  price?: number | null,
  market: Market = 'fr'
): string {
  const priceContext = price ? `Le produit coûte ${price}€.` : '';
  const lang = LANGUAGE_LABELS[market] || LANGUAGE_LABELS.fr;
  const [t1, t2, t3] = TESTIMONIAL_LOCALES[market] || TESTIMONIAL_LOCALES.fr;
  return `Tu es un expert en copywriting de conversion et en marketing d'affiliation.
Génère du contenu marketing percutant en ${lang} pour la page de vente suivante.
IMPORTANT : toutes les valeurs textuelles du JSON (titres, descriptions, FAQ,
témoignages, meta) doivent être rédigées en ${lang}, y compris les prénoms et
villes des témoignages (utilise des prénoms et villes crédibles pour ce marché,
par exemple ${t1.name} (${t1.location}), ${t2.name} (${t2.location}) — adapte,
n'utilise pas forcément ces noms exacts).

Produit : ${productName}
Description : ${productDescription}
${priceContext}

Génère un JSON avec exactement cette structure (tout en ${lang}) :

{
  "hero_title": "Titre accrocheur et percutant (max 80 caractères), qui parle directement au problème du client",
  "hero_subtitle": "Sous-titre qui explique la transformation promise (1-2 phrases max)",
  "pain_points": [
    { "emoji": "😩", "title": "Le problème en 5 mots", "description": "Description courte du problème ressenti (1 phrase)" },
    { "emoji": "😤", "title": "Deuxième problème", "description": "Description courte" },
    { "emoji": "😰", "title": "Troisième problème", "description": "Description courte" }
  ],
  "benefits": [
    { "icon": "✅", "title": "Bénéfice principal en 5 mots", "description": "Explication courte du bénéfice (1 phrase)" },
    { "icon": "⚡", "title": "Deuxième bénéfice", "description": "Explication courte" },
    { "icon": "🎯", "title": "Troisième bénéfice", "description": "Explication courte" },
    { "icon": "💪", "title": "Quatrième bénéfice", "description": "Explication courte" },
    { "icon": "🔥", "title": "Cinquième bénéfice", "description": "Explication courte" }
  ],
  "faq": [
    { "question": "Question fréquente 1 ?", "answer": "Réponse rassurante et complète (2-3 phrases)" },
    { "question": "Question fréquente 2 ?", "answer": "Réponse" },
    { "question": "Est-ce que ça marche vraiment ?", "answer": "Réponse qui lève les doutes" },
    { "question": "Combien de temps avant de voir des résultats ?", "answer": "Réponse réaliste et encourageante" },
    { "question": "Et si ça ne me convient pas ?", "answer": "Réponse sur la garantie et le service client" }
  ],
  "tiktok_script": "Script TikTok court et viral (30 secondes max) : Hook + Problème + Solution + CTA. Commence par une phrase choc.",
  "testimonials": [
    { "name": "${t1.name}", "location": "${t1.location}", "rating": 5, "text": "Témoignage réaliste et enthousiaste (2-3 phrases, EN ${lang}) avec des détails spécifiques", "date": "il y a 3 jours (traduit en ${lang})" },
    { "name": "${t2.name}", "location": "${t2.location}", "rating": 5, "text": "Témoignage différent avec d'autres bénéfices mentionnés (EN ${lang})", "date": "il y a 1 semaine (traduit en ${lang})" },
    { "name": "${t3.name}", "location": "${t3.location}", "rating": 5, "text": "Témoignage d'une personne sceptique au départ qui a été convaincue (EN ${lang})", "date": "il y a 2 semaines (traduit en ${lang})" }
  ],
  "meta_title": "Titre SEO optimisé (max 60 caractères)",
  "meta_description": "Description meta pour le SEO (max 155 caractères), avec call-to-action"
}

IMPORTANT: Retourne uniquement le JSON valide, sans markdown ni texte supplémentaire.
RAPPEL: le contenu doit être entièrement en ${lang}, pas en français si ${lang} n'est pas le français.`;
}

// ─── Gemini 2.5 Flash (via OpenAI-compatible endpoint) ───────────────────────

function getGeminiClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  });
}

// ─── Claude Sonnet (via Anthropic OpenAI-compatible endpoint) ─────────────────

function getClaudeClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    baseURL: 'https://api.anthropic.com/v1/',
    defaultHeaders: {
      'anthropic-version': '2023-06-01',
    },
  });
}

// ─── OpenAI GPT-4o-mini (legacy fallback) ────────────────────────────────────

function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
}

// ─── Detect active provider ──────────────────────────────────────────────────

type Provider = 'gemini' | 'claude' | 'openai';

function getActiveProvider(): Provider {
  // Gemini free tier en priorité (pas de quota billing)
  // OpenAI désactivé : quota dépassé (recharger sur platform.openai.com/billing)
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'openai';
}

const PROVIDER_MODELS: Record<Provider, string> = {
  gemini: 'gemini-2.5-flash',
  claude: 'claude-sonnet-4-6',
  openai: 'gpt-4o-mini',
};

// ─── Core generation function ─────────────────────────────────────────────────

async function generateWithProvider(
  prompt: string,
  provider: Provider,
  retries = 2
): Promise<string> {
  let client: OpenAI;
  const model = PROVIDER_MODELS[provider];

  switch (provider) {
    case 'gemini':
      client = getGeminiClient();
      break;
    case 'claude':
      client = getClaudeClient();
      break;
    default:
      client = getOpenAIClient();
  }

  // Claude doesn't support response_format: json_object — wrap in system prompt instead
  const isJsonMode = provider !== 'claude';

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en copywriting de marketing direct. Tu génères uniquement du JSON valide, sans aucun formatage markdown.',
          },
          { role: 'user', content: prompt },
        ],
        ...(isJsonMode ? { response_format: { type: 'json_object' } } : {}),
        temperature: 0.8,
        max_tokens: 3000,
      });
      return response.choices[0]?.message?.content || '';
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      // Retry on 503/429/500 with exponential backoff
      if (attempt < retries && status && [429, 500, 503].includes(status)) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

// ─── Main exported function ───────────────────────────────────────────────────

function parseAndValidate(content: string, productName: string, productDescription: string, market: Market = 'fr'): GeneratedContent {
  // Step 1: strip markdown fences
  let cleaned = content
    .replace(/^```(?:json)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();

  // Step 2: extract the outermost JSON object (handles extra text before/after)
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  let parsed: Partial<GeneratedContent> = {};

  // Strategy 1: direct parse
  try {
    parsed = JSON.parse(cleaned) as GeneratedContent;
  } catch {
    // Strategy 2: fix single-quoted property names and trailing commas
    try {
      const fixed = cleaned
        .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3') // 'key': → "key":
        .replace(/,(\s*[}\]])/g, '$1');                    // trailing commas
      parsed = JSON.parse(fixed) as GeneratedContent;
    } catch {
      // Strategy 3: return safe defaults (never throw — don't block the pipeline)
      parsed = {};
    }
  }

  return {
    hero_title: parsed.hero_title || `${HERO_FALLBACK_PREFIX[market] || HERO_FALLBACK_PREFIX.fr} ${productName}`,
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

export async function generateProductContent(
  productDescription: string,
  productName: string,
  price?: number | null,
  market: Market = 'fr'
): Promise<GeneratedContent & { _provider: string }> {
  const prompt = buildContentPrompt(productName, productDescription, price, market);
  const provider = getActiveProvider();

  try {
    const raw = await generateWithProvider(prompt, provider);
    const result = parseAndValidate(raw, productName, productDescription, market);
    return { ...result, _provider: provider };
  } catch (err) {
    // Fallback chain
    const fallbacks: Provider[] = ['gemini', 'claude', 'openai'].filter(
      (p) => p !== provider
    ) as Provider[];

    for (const fallback of fallbacks) {
      const key = fallback === 'gemini' ? process.env.GEMINI_API_KEY
        : fallback === 'claude' ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENAI_API_KEY;
      if (!key) continue;

      try {
        const raw = await generateWithProvider(prompt, fallback);
        const result = parseAndValidate(raw, productName, productDescription, market);
        return { ...result, _provider: `${fallback} (fallback from ${provider})` };
      } catch {
        continue;
      }
    }

    throw err; // all providers failed
  }
}

// ─── Weekly report generation ─────────────────────────────────────────────────

export async function generateWeeklyReport(
  top3: unknown[],
  flop3: unknown[],
  totalProducts: number
): Promise<Record<string, unknown>> {
  const provider = getActiveProvider();
  const model = PROVIDER_MODELS[provider];

  let client: OpenAI;
  switch (provider) {
    case 'gemini': client = getGeminiClient(); break;
    case 'claude': client = getClaudeClient(); break;
    default: client = getOpenAIClient();
  }

  const prompt = `Tu es un expert en affiliation e-commerce. Analyse ces données de la semaine et génère un rapport en JSON.
Top produits: ${JSON.stringify(top3)}
Flop produits: ${JSON.stringify(flop3)}
Total produits: ${totalProducts}

Génère: {"summary": "phrase résumé", "top_products": ["conseil1", "conseil2", "conseil3"], "to_archive": ["produit à archiver si CTR < 1%"], "recommendations": ["action1", "action2", "action3"], "insight": "observation clé de la semaine"}`;

  const isJsonMode = provider !== 'claude';
  const completion = await client.chat.completions.create({
    model,
    ...(isJsonMode ? { response_format: { type: 'json_object' } } : {}),
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
  });

  const raw = completion.choices[0].message.content || '{}';
  const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  return JSON.parse(cleaned);
}
