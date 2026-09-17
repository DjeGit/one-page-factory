/**
 * /api/cron/exchange-rates (Sprint 5)
 *
 * Alimente la table exchange_rates quotidiennement — source gratuite
 * frankfurter.app (banque centrale européenne, pas de clé API requise).
 * Seule la paire EUR→GBP est nécessaire aujourd'hui (FR/ES = EUR, UK =
 * GBP, cf. lib/market.ts), mais la boucle reste générique pour d'éventuels
 * marchés futurs hors zone euro.
 *
 * Auth : session admin (cookie) OU secret serveur-à-serveur (Bearer),
 * même pattern que /api/market/refresh.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase';
import { hashAdminToken } from '@/lib/admin-auth';

const TARGET_CURRENCIES = ['GBP'] as const;

function isAuthorized(req: NextRequest): boolean {
  const authCookie = cookies().get('admin_auth');
  const adminSecret = process.env.ADMIN_SECRET || 'changeme';
  if (authCookie?.value === hashAdminToken(adminSecret)) return true;

  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  const cronSecret = process.env.INTERNAL_CRON_SECRET || process.env.PIPELINE_SECRET || process.env.ADMIN_SECRET || '';
  return Boolean(token) && Boolean(cronSecret) && token === cronSecret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  const results: { currency: string; rate?: number; error?: string }[] = [];

  for (const target of TARGET_CURRENCIES) {
    try {
      const res = await fetch(`https://api.frankfurter.app/latest?from=EUR&to=${target}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rate = json?.rates?.[target];
      if (typeof rate !== 'number') throw new Error('Réponse frankfurter.app sans taux exploitable');

      const { error } = await sb.from('exchange_rates').insert({
        base_currency: 'EUR',
        target_currency: target,
        rate,
        fetched_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);

      results.push({ currency: target, rate });
    } catch (err) {
      results.push({ currency: target, error: (err as Error).message });
    }
  }

  const hasError = results.some((r) => r.error);
  return NextResponse.json({ success: !hasError, results }, { status: hasError ? 502 : 200 });
}

// GET = dernier taux connu par devise, sans en récupérer un nouveau (lecture rapide pour l'UI).
export async function GET() {
  const sb = getSupabaseAdmin();
  const rows: { currency: string; rate: number | null; fetched_at: string | null }[] = [];

  for (const target of TARGET_CURRENCIES) {
    const { data } = await sb
      .from('exchange_rates')
      .select('rate, fetched_at')
      .eq('base_currency', 'EUR')
      .eq('target_currency', target)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    rows.push({ currency: target, rate: data?.rate != null ? Number(data.rate) : null, fetched_at: data?.fetched_at ?? null });
  }

  return NextResponse.json({ rates: rows });
}
