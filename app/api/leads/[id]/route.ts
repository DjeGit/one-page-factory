import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseAdmin();
  await sb.from('email_leads').delete().eq('id', params.id);
  return NextResponse.json({ success: true });
}
