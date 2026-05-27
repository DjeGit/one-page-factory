import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';

export async function POST() {
  const sb = getSupabaseAdmin();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: products } = await sb.from('products').select('id, name, slug, active, price');

  const stats = await Promise.all((products || []).map(async (p) => {
    const [{ count: clicks }, { count: views }] = await Promise.all([
      sb.from('clicks').select('*', { count: 'exact', head: true }).eq('product_id', p.id).gte('clicked_at', weekAgo),
      sb.from('page_views').select('*', { count: 'exact', head: true }).eq('product_id', p.id).gte('viewed_at', weekAgo),
    ]);
    return { name: p.name, slug: p.slug, clicks: clicks || 0, views: views || 0, ctr: views ? ((clicks || 0) / views * 100).toFixed(1) : '0' };
  }));

  const sorted = stats.sort((a, b) => b.clicks - a.clicks);
  const top3 = sorted.slice(0, 3);
  const flop3 = sorted.slice(-3).filter(p => p.views > 0);

  const prompt = `Tu es un expert en affiliation e-commerce. Analyse ces données de la semaine et génère un rapport en JSON.
Top produits: ${JSON.stringify(top3)}
Flop produits: ${JSON.stringify(flop3)}
Total produits: ${products?.length}

Génère: {"summary": "phrase résumé", "top_products": ["conseil1", "conseil2", "conseil3"], "to_archive": ["produit à archiver si CTR < 1%"], "recommendations": ["action1", "action2", "action3"], "insight": "observation clé de la semaine"}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  });

  const report = JSON.parse(completion.choices[0].message.content || '{}');
  return NextResponse.json({ report, stats: sorted, generated_at: new Date().toISOString() });
}
