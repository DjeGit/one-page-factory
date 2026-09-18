import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { DEFAULT_MARKET, isValidMarket, type Market } from '@/lib/market';

// --- Email de bienvenue transactionnel (Brevo) ---
const WELCOME_CONTENT = {
  fr: {
    subject: 'Bienvenue sur Tendpick — votre sélection vous attend !',
    html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px"><h1 style="font-size:22px;font-weight:900;color:#111">Merci de nous avoir rejoint !</h1><p style="color:#555;line-height:1.6">Vous faites maintenant partie des premiers à découvrir nos produits tendance.</p><a href="https://tendpick.fr" style="display:inline-block;background:#7C3AED;color:#fff;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none">Découvrir les produits →</a></div>',
  },
  es: {
    subject: 'Bienvenido a Tendpick — ¡tu selección te espera!',
    html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px"><h1 style="font-size:22px;font-weight:900;color:#111">¡Gracias por unirte!</h1><p style="color:#555;line-height:1.6">Ahora formas parte de los primeros en descubrir nuestros productos tendencia.</p><a href="https://tendpick.es" style="display:inline-block;background:#7C3AED;color:#fff;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none">Descubrir productos →</a></div>',
  },
  uk: {
    subject: 'Welcome to Tendpick — your selection is waiting!',
    html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px"><h1 style="font-size:22px;font-weight:900;color:#111">Thanks for joining us!</h1><p style="color:#555;line-height:1.6">You are now among the first to discover our curated trending products.</p><a href="https://tendpick.com" style="display:inline-block;background:#7C3AED;color:#fff;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none">Discover products →</a></div>',
  },
} as const;

async function sendWelcomeEmail(email: string, market: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;
  const m = (market as keyof typeof WELCOME_CONTENT) in WELCOME_CONTENT
    ? (market as keyof typeof WELCOME_CONTENT) : 'fr';
  const { subject, html } = WELCOME_CONTENT[m];
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: [{ email }],
        sender: { name: 'Tendpick', email: 'hello@tendpick.fr' },
        subject,
        htmlContent: html,
      }),
    });
  } catch { /* silencieux — ne bloque jamais la capture du lead */ }
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
  } catch { /* silencieux */ }
}

// GET /api/leads?market=fr&product_id=...&contact_type=client — filtres
// optionnels utilisés par l'écran Admin > Leads & Emails (Répertoire).
// marketFilter matche soit market (marché "principal", leads auto-capturés)
// soit markets[] (contact manuel rattaché à plusieurs marchés à la fois).
export async function GET(req: NextRequest) {
  const sb = getSupabaseAdmin();
  const url = new URL(req.url);
  const productFilter = url.searchParams.get('product_id');
  const marketFilter = url.searchParams.get('market');
  const typeFilter = url.searchParams.get('contact_type');
  const { data } = await sb
    .from('email_leads')
    .select('*, products(name, slug)')
    .order('created_at', { ascending: false });
  let leads = data || [];
  if (productFilter) leads = leads.filter((l: Record<string, unknown>) => l.product_id === productFilter);
  if (marketFilter) {
    leads = leads.filter((l: Record<string, unknown>) =>
      l.market === marketFilter || (Array.isArray(l.markets) && (l.markets as string[]).includes(marketFilter))
    );
  }
  if (typeFilter) leads = leads.filter((l: Record<string, unknown>) => l.contact_type === typeFilter);
  return NextResponse.json(leads);
}

// Création manuelle d'un contact (client/fournisseur) depuis le
// Répertoire — distinct de la capture automatique de leads publics
// ci-dessous : pas d'upsert (pas de déduplication attendue ici), email
// optionnel (un fournisseur peut n'avoir qu'un téléphone au départ), mais
// au moins un moyen de contact (email ou téléphone) et au moins un marché
// sont exigés.
async function createManualContact(sb: ReturnType<typeof getSupabaseAdmin>, body: Record<string, unknown>) {
  const contactType = body.contact_type;
  if (contactType !== 'client' && contactType !== 'fournisseur') {
    return NextResponse.json({ error: 'Type de contact invalide (client ou fournisseur)' }, { status: 400 });
  }

  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;
  const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null;
  if (!email && !phone) {
    return NextResponse.json({ error: 'Renseignez au moins un email ou un téléphone' }, { status: 400 });
  }
  if (email && !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
  }

  const markets: Market[] = Array.isArray(body.markets) ? body.markets.filter(isValidMarket) : [];
  if (markets.length === 0) {
    return NextResponse.json({ error: 'Sélectionnez au moins un marché' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('email_leads')
    .insert({
      contact_type: contactType,
      email,
      phone,
      first_name: typeof body.first_name === 'string' ? body.first_name.trim() || null : null,
      last_name: typeof body.last_name === 'string' ? body.last_name.trim() || null : null,
      company: typeof body.company === 'string' ? body.company.trim() || null : null,
      website: typeof body.website === 'string' ? body.website.trim() || null : null,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      market: markets[0],
      markets,
      product_id: null,
      source_slug: null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseAdmin();
  const body = await req.json();

  if (body.manual === true) {
    return createManualContact(sb, body);
  }

  const { email, product_id, source_slug } = body;
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
  }

  // Marché du lead : dérivé du PRODUIT concerné (source la plus fiable —
  // Sprint 1), jamais de la préférence admin (route publique, cf. doc de
  // lib/get-active-market.ts). Fallback sur le cookie public 'opf_market'
  // (posé par le middleware selon le domaine visité) puis sur le défaut.
  let market: string = DEFAULT_MARKET;
  if (product_id) {
    const { data: product } = await sb.from('products').select('market').eq('id', product_id).single();
    if (product?.market && isValidMarket(product.market)) market = product.market;
  }
  if (market === DEFAULT_MARKET) {
    const publicMarketCookie = cookies().get('opf_market')?.value;
    if (publicMarketCookie && isValidMarket(publicMarketCookie)) market = publicMarketCookie;
  }

  // Upsert avec market ; filet de sécurité si jamais la colonne n'existe pas
  // encore sur cet environnement (code Postgres 42703 = colonne manquante).
  let upsertResult = await sb
    .from('email_leads')
    .upsert({ email, product_id, source_slug, market, markets: [market] }, { onConflict: 'email,product_id', ignoreDuplicates: true })
    .select().single();
  if (upsertResult.error && (upsertResult.error as { code?: string }).code === '42703') {
    upsertResult = await sb
      .from('email_leads')
      .upsert({ email, product_id, source_slug }, { onConflict: 'email,product_id', ignoreDuplicates: true })
      .select().single();
  }
  const { data, error } = upsertResult;

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Sync CRM (non bloquant, échec silencieux). Note : sendWelcomeEmail()
  // existe mais n'est délibérément pas appelée ici, comme sur le serveur —
  // l'e-mail de bienvenue est probablement déjà géré par une automatisation
  // Brevo déclenchée à l'ajout en liste. Ne pas l'activer sans vérifier
  // d'abord avec Jerome qu'il n'y a pas de double envoi.
  syncToBrevo(email, market, body.productName).catch(() => {});

  return NextResponse.json({ success: true, data });
}
