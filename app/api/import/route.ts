import { NextResponse } from 'next/server';
import { getSupabaseAdmin, generateSlug } from '@/lib/supabase';
import type { ImportRow } from '@/types';

export async function POST(req: Request) {
  const sb = getSupabaseAdmin();
  const body = await req.json();
  const rows: ImportRow[] = body.rows || [];

  if (!rows.length) return NextResponse.json({ error: 'Aucune ligne' }, { status: 400 });
  if (rows.length > 100) return NextResponse.json({ error: 'Maximum 100 lignes' }, { status: 400 });

  const results = [];
  for (const row of rows) {
    if (!row.name || !row.affiliate_url) {
      results.push({ name: row.name, status: 'skipped', reason: 'Nom ou URL manquant' });
      continue;
    }

    let slug = generateSlug(row.name);
    const { data: existing } = await sb.from('products').select('slug').eq('slug', slug).single();
    if (existing) slug = `${slug}-${Date.now()}`;

    const redirectCode = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

    const { data: product, error } = await sb.from('products').insert({
      name: row.name,
      slug,
      affiliate_url: row.affiliate_url,
      price: row.price ? parseFloat(row.price) : null,
      original_price: row.original_price ? parseFloat(row.original_price) : null,
      image_url: row.image_url || null,
      description: row.description || null,
      redirect_code: redirectCode,
      active: false, // inactive until AI content generated
    }).select().single();

    if (error) {
      results.push({ name: row.name, status: 'error', reason: error.message });
      continue;
    }
    results.push({ name: row.name, status: 'created', product_id: product.id, slug: product.slug });
  }

  const created = results.filter(r => r.status === 'created').length;
  return NextResponse.json({ success: true, total: rows.length, created, skipped: rows.length - created, results });
}
