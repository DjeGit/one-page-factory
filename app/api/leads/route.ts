import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_MARKET, isValidMarket, type Market } from '@/lib/market';
import { getRequestMarket } from '@/lib/site-url';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, createRateLimiter, dbErrorResponse, getClientIp, isUuid, readJsonObject, unauthorized } from '../_lib/http';

const CONTACT_TYPES = ['lead', 'client', 'fournisseur', 'partenaire'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PAGE = 1000;
const MAX_ROWS = 20000;
// Capture publique : 10 inscriptions par minute et par visiteur suffisent largement à un humain.
const captureLimiter = createRateLimiter(10, 60_000);

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
        sender: { name: 'Tendpick', email: 'contact@tendpick.com' },
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
// optionnels utilisés par l'écran Admin > Contacts (Répertoire).
// marketFilter matche soit market (marché "principal", leads auto-capturés)
// soit markets[] (contact manuel rattaché à plusieurs marchés à la fois).
// Les filtres sont appliqués par la base (avant : TOUTE la table était chargée puis filtrée en
// mémoire, et Supabase tronque silencieusement à 1000 lignes — les contacts au-delà disparaissaient
// de l'écran). La liste est lue par pages de 1000.
export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  const sb = getSupabaseAdmin();
  const url = new URL(req.url);
  const productFilter = url.searchParams.get('product_id');
  const marketFilter = url.searchParams.get('market');
  const typeFilter = url.searchParams.get('contact_type');
  if (productFilter && !isUuid(productFilter)) return badRequest('product_id invalide');
  if (marketFilter && !isValidMarket(marketFilter)) return badRequest('Marché invalide');
  if (typeFilter && !CONTACT_TYPES.includes(typeFilter)) return badRequest('Type de contact invalide');

  const leads: Record<string, unknown>[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let query = sb
      .from('email_leads')
      .select('*, products(name, slug)')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true }) // ordre stable entre deux pages
      .range(from, from + PAGE - 1);
    if (productFilter) query = query.eq('product_id', productFilter);
    // marketFilter est validé (fr/es/uk) : sûr dans l'expression de filtre.
    if (marketFilter) query = query.or(`market.eq.${marketFilter},markets.cs.{${marketFilter}}`);
    if (typeFilter) query = query.eq('contact_type', typeFilter);
    const { data, error } = await query;
    if (error) return dbErrorResponse('GET /api/leads', error);
    leads.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
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
  if (contactType !== 'client' && contactType !== 'fournisseur' && contactType !== 'partenaire') {
    return NextResponse.json({ error: 'Type de contact invalide (client, fournisseur ou partenaire)' }, { status: 400 });
  }

  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;
  const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null;
  if (!email && !phone) {
    return NextResponse.json({ error: 'Renseignez au moins un email ou un téléphone' }, { status: 400 });
  }
  if (email && !EMAIL_RE.test(email)) {
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

  if (error) return dbErrorResponse('POST /api/leads (contact manuel)', error);
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseAdmin();
  const parsed = await readJsonObject(req);
  if ('response' in parsed) return parsed.response;
  const body = parsed.body;

  // Ajout manuel de contact (client/fournisseur, écran admin Répertoire) —
  // distinct de la capture publique ci-dessous, qui doit rester accessible
  // sans authentification (formulaires sur les pages produit publiques).
  if (body.manual === true) {
    if (!isAuthorizedRequest(req)) return unauthorized();
    return createManualContact(sb, body);
  }

  const ip = getClientIp(req.headers);
  if (ip && !captureLimiter.allow(ip)) {
    return NextResponse.json({ error: 'Trop de requêtes, réessayez dans une minute.' }, { status: 429 });
  }

  // Avant : `email.includes` plantait (500) si email n'était pas un texte ; product_id n'était pas
  // vérifié ; la casse et les espaces créaient des doublons (Jean@x.fr / jean@x.fr).
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return badRequest('Email invalide');
  }
  const product_id = typeof body.product_id === 'string' && body.product_id ? body.product_id : null;
  if (product_id && !isUuid(product_id)) return badRequest('Produit invalide');
  const source_slug = typeof body.source_slug === 'string' && body.source_slug ? body.source_slug.slice(0, 200) : null;
  const productName = typeof body.productName === 'string' ? body.productName.slice(0, 200) : undefined;

  // Marché du lead : dérivé du PRODUIT concerné (source la plus fiable —
  // Sprint 1), jamais de la préférence admin (route publique, cf. doc de
  // lib/get-active-market.ts). Fallback sur le host de la requête (même
  // détection canonique que middleware.ts).
  //
  // Audit 21/09 (bug HIGH corrigé) : le fallback lisait le cookie
  // opf_market, illisible dans la même requête qui vient de le poser — un
  // lead capturé hors page produit (popup générique, bio link) dès la
  // première visite retombait toujours sur DEFAULT_MARKET ('fr'). Le host
  // est fiable dès la première requête.
  let market: string = DEFAULT_MARKET;
  let marketFromProduct = false;
  if (product_id) {
    const { data: product } = await sb.from('products').select('market').eq('id', product_id).maybeSingle();
    if (product?.market && isValidMarket(product.market)) {
      market = product.market;
      marketFromProduct = true;
    }
  }
  // Le host ne sert que si le produit n'a pas donné le marché (avant : un produit FR consulté
  // depuis un autre domaine était rattaché au marché du domaine).
  if (!marketFromProduct) {
    market = getRequestMarket(req.headers);
  }

  // Un même email déjà inscrit (même produit, ou inscription générique sans produit) n'est PAS une
  // erreur pour le visiteur : avant, le doublon renvoyait un 400 « JSON object requested… » et le
  // formulaire affichait un échec. Sans produit, la contrainte d'unicité (email, product_id) ne joue
  // pas (NULL ≠ NULL) : on vérifie nous-mêmes pour ne pas empiler les doublons.
  if (!product_id) {
    const { data: already, error: lookupError } = await sb
      .from('email_leads')
      .select('id')
      .eq('email', email)
      .is('product_id', null)
      .limit(1);
    if (lookupError) return dbErrorResponse('POST /api/leads (recherche doublon)', lookupError);
    if (already && already.length > 0) {
      syncToBrevo(email, market, productName).catch(() => {});
      return NextResponse.json({ success: true, duplicate: true });
    }
  }

  // Upsert avec market ; filet de sécurité si jamais la colonne n'existe pas
  // encore sur cet environnement (code Postgres 42703 = colonne manquante).
  // ignoreDuplicates : pas de ligne renvoyée pour un doublon -> tableau, jamais .single().
  let upsertResult = await sb
    .from('email_leads')
    .upsert({ email, product_id, source_slug, market, markets: [market] }, { onConflict: 'email,product_id', ignoreDuplicates: true })
    .select('id');
  if (upsertResult.error && (upsertResult.error as { code?: string }).code === '42703') {
    upsertResult = await sb
      .from('email_leads')
      .upsert({ email, product_id, source_slug }, { onConflict: 'email,product_id', ignoreDuplicates: true })
      .select('id');
  }
  const { data, error } = upsertResult;

  if (error) return dbErrorResponse('POST /api/leads', error);

  // Sync CRM (non bloquant, échec silencieux). Note : sendWelcomeEmail()
  // existe mais n'est pas appelée ici. Vérifié le 07/10 dans Brevo : il n'y
  // a AUCUNE automatisation ni template, donc aucun e-mail de bienvenue
  // n'est envoyé aujourd'hui. L'expéditeur de la fonction est maintenant
  // contact@tendpick.com (vérifié) ; l'activer = décision de Jerome.
  syncToBrevo(email, market, productName).catch(() => {});

  return NextResponse.json({ success: true, duplicate: !data || data.length === 0 });
}
