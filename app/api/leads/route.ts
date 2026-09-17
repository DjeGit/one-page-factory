import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

// --- Brevo transactional welcome email ---
const WELCOME_CONTENT = {
  fr: {
    subject: "Bienvenue sur Tendpick â votre sÃ©lection vous attend !",
    html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px"><h1 style="font-size:22px;font-weight:900;color:#111">Merci de nous avoir rejoint !</h1><p style="color:#555;line-height:1.6">Vous faites maintenant partie des premiers Ã  dÃ©couvrir nos produits tendance.</p><a href="https://tendpick.fr" style="display:inline-block;background:#7C3AED;color:#fff;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none">DÃ©couvrir les produits â</a></div>',
  },
  es: {
    subject: "Bienvenido a Tendpick â Â¡tu selecciÃ³n te espera!",
    html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px"><h1 style="font-size:22px;font-weight:900;color:#111">Â¡Gracias por unirte!</h1><p style="color:#555;line-height:1.6">Ahora formas parte de los primeros en descubrir nuestros productos tendencia.</p><a href="https://tendpick.es" style="display:inline-block;background:#7C3AED;color:#fff;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none">Descubrir productos â</a></div>',
  },
  com: {
    subject: "Welcome to Tendpick â your selection is waiting!",
    html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px"><h1 style="font-size:22px;font-weight:900;color:#111">Thanks for joining us!</h1><p style="color:#555;line-height:1.6">You are now among the first to discover our curated trending products.</p><a href="https://tendpick.com" style="display:inline-block;background:#7C3AED;color:#fff;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none">Discover products â</a></div>',
  },
} as const;

async function sendWelcomeEmail(email: string, market: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;
  const m = (market as keyof typeof WELCOME_CONTENT) in WELCOME_CONTENT
    ? (market as keyof typeof WELCOME_CONTENT) : "fr";
  const { subject, html } = WELCOME_CONTENT[m];
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        to: [{ email }],
        sender: { name: "Tendpick", email: "hello@tendpick.fr" },
        subject,
        htmlContent: html,
      }),
    });
  } catch { /* silent */ }
}

async function syncToBrevo(email: string, market: string, productName?: string) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;
  const listId = (() => {
    const m = market.toUpperCase();
    const k = process.env['BREVO_LIST_ID_' + m] ?? process.env.BREVO_LIST_ID;
    return k ? parseInt(k) : null;
  })();
  const payload: Record<string, unknown> = {
    email,
    updateEnabled: true,
    attributes: { MARKET: market.toUpperCase(), SOURCE: productName ?? 'tendpick' },
  };
  if (listId) payload.listIds = [listId];
  try {
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch { /* silent */ }
}

export async function GET(req: NextRequest) {
  const sb = getSupabaseAdmin();
  const url = new URL(req.url);
  const productFilter = url.searchParams.get('product_id');
  const marketFilter = url.searchParams.get('market');
  const { data } = await sb
    .from('email_leads')
    .select('*, products(name, slug)')
    .order('created_at', { ascending: false });
  let leads = data || [];
  if (productFilter) leads = leads.filter((l: Record<string, string>) => l.product_id === productFilter);
  if (marketFilter) leads = leads.filter((l: Record<string, string>) => l.market === marketFilter);
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseAdmin();
  const body = await req.json();
  const { email, product_id, source_slug } = body;
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
  }
  const cookieStore = cookies();
  const market = cookieStore.get('opf_market')?.value ?? 'fr';

  // Try upsert with market (needs market column in email_leads — run SQL migration first)
  let upsertResult = await sb
    .from('email_leads')
    .upsert({ email, product_id, source_slug, market }, { onConflict: 'email,product_id', ignoreDuplicates: true })
    .select().single();
  // Fallback: if market column missing (code 42703), retry without it
  if (upsertResult.error && (upsertResult.error as {code?: string}).code === '42703') {
    upsertResult = await sb
      .from('email_leads')
      .upsert({ email, product_id, source_slug }, { onConflict: 'email,product_id', ignoreDuplicates: true })
      .select().single();
  }
  const { data, error } = upsertResult;

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Sync to Brevo (non-blocking, silent fail)
  syncToBrevo(email, market, body.productName).catch(() => {});

  return NextResponse.json({ success: true, data });
}
