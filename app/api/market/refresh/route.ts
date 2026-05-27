import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';

const CATEGORIES = [
  'Tech & Gadgets',
  'Mode & Beauté',
  'Lifestyle & Maison',
  'Sport & Bien-être',
  'Art & Créativité',
];

const SYSTEM_PROMPT = `Tu es un expert en e-commerce, dropshipping et marketing d'affiliation.
Tu analyses les tendances de vente sur TikTok, Instagram, Amazon, AliExpress, Etsy, Temu et les plateformes sociales.
Tu retournes uniquement du JSON valide, sans commentaires ni markdown.`;

const buildUserPrompt = (category: string) => `
Identifie les 20 produits qui se vendent le mieux actuellement dans la catégorie "${category}".
Sources à prendre en compte : TikTok Shop, TikTok Creative Center, Amazon Best Sellers, AliExpress Hot Products,
Instagram Shopping, Pinterest Trending, Temu Best Sellers, Etsy Trending.

Pour chaque produit retourne un objet JSON avec ces champs EXACTEMENT :
{
  "name": "Nom précis du produit en français",
  "description": "Description marketing courte (2 phrases max)",
  "price_min": prix_minimum_en_euros (nombre),
  "price_max": prix_maximum_en_euros (nombre),
  "price_avg": prix_moyen_en_euros (nombre),
  "best_offer": "Nom de la plateforme avec le meilleur prix",
  "best_offer_price": meilleur_prix_en_euros (nombre),
  "platforms": ["liste", "des", "plateformes", "où", "il", "est", "vendu"],
  "confidence_score": score_de_confiance_entre_1_et_10,
  "trend_score": score_de_tendance_entre_1_et_10,
  "source_notes": "Explication courte : pourquoi ce produit est tendance maintenant"
}

Le confidence_score reflète la fiabilité des données (10 = très populaire sur plusieurs sources).
Le trend_score reflète l'élan actuel (10 = viral en ce moment).

Retourne un tableau JSON de 20 objets, sans aucun texte autour.
`;

export async function POST() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const supabaseAdmin = getSupabaseAdmin();

  try {
    // Delete old data
    await supabaseAdmin.from('market_products').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const allProducts: object[] = [];

    for (const category of CATEGORIES) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: buildUserPrompt(category) + '\n\nRetourne : {"products": [...les 20 objets...]}',
            },
          ],
          temperature: 0.7,
        });

        const raw = completion.choices[0].message.content || '{"products":[]}';
        const parsed = JSON.parse(raw);
        const products = Array.isArray(parsed.products) ? parsed.products : [];

        const rows = products.slice(0, 20).map((p: Record<string, unknown>) => ({
          category,
          name: String(p.name || ''),
          description: String(p.description || ''),
          price_min: Number(p.price_min) || null,
          price_max: Number(p.price_max) || null,
          price_avg: Number(p.price_avg) || null,
          best_offer: String(p.best_offer || ''),
          best_offer_price: Number(p.best_offer_price) || null,
          platforms: Array.isArray(p.platforms) ? p.platforms : [],
          confidence_score: Math.min(10, Math.max(1, Number(p.confidence_score) || 5)),
          trend_score: Math.min(10, Math.max(1, Number(p.trend_score) || 5)),
          source_notes: String(p.source_notes || ''),
          last_refreshed: new Date().toISOString(),
        }));

        allProducts.push(...rows);
      } catch (err) {
        console.error(`Error fetching category ${category}:`, err);
      }
    }

    if (allProducts.length > 0) {
      const { error } = await supabaseAdmin.from('market_products').insert(allProducts);
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      count: allProducts.length,
      refreshed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Market refresh error:', err);
    return NextResponse.json({ error: 'Erreur lors du rafraîchissement' }, { status: 500 });
  }
}
