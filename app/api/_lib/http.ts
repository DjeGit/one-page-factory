/**
 * Outils communs des routes API (dossier préfixé « _ » : jamais exposé comme route).
 *
 * Objectif : que chaque route réponde de la même façon —
 *  - corps JSON illisible -> 400 (et non 500) ;
 *  - erreur de base de données -> statut juste + message français sans fuite
 *    du texte interne de Postgres/Supabase (le détail reste dans les logs serveur) ;
 *  - identifiants vérifiés avant d'être envoyés à la base.
 */
import { NextResponse } from 'next/server';
import { isUuid } from '@/lib/visitor-tracking';

export { isUuid };

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = 'Erreur serveur'): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Réponse standard pour un identifiant d'URL mal formé (évite l'erreur Postgres 22P02). */
export function invalidId(label = 'identifiant'): NextResponse {
  return badRequest(`${label} invalide`);
}

export type JsonBody = Record<string, unknown>;

/**
 * Lit un corps JSON qui doit être un objet. Renvoie `{ body }` ou `{ response }`
 * (400) : `const r = await readJsonObject(req); if ('response' in r) return r.response;`
 */
export async function readJsonObject(req: Request): Promise<{ body: JsonBody } | { response: NextResponse }> {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return { response: badRequest('Corps de requête JSON invalide') };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { response: badRequest('Le corps de la requête doit être un objet JSON') };
  }
  return { body: parsed as JsonBody };
}

/**
 * Comme readJsonObject, mais un corps ABSENT est accepté (objet vide) : pour les routes
 * appelées par cron sans paramètres. Un corps présent mais illisible reste une erreur 400
 * (avant : il était ignoré en silence et la route tournait avec ses valeurs par défaut).
 */
export async function readOptionalJsonObject(req: Request): Promise<{ body: JsonBody } | { response: NextResponse }> {
  const raw = await req.text();
  if (!raw.trim()) return { body: {} };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { response: badRequest('Corps de requête JSON invalide') };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { response: badRequest('Le corps de la requête doit être un objet JSON') };
  }
  return { body: parsed as JsonBody };
}

interface PgLikeError {
  code?: string;
  message?: string;
}

/**
 * Traduit une erreur de base de données en réponse HTTP. Le message brut est
 * journalisé (jamais renvoyé) ; l'admin reçoit une phrase claire pour les cas
 * courants (doublon, référence, valeur invalide, introuvable).
 */
export function dbErrorResponse(context: string, err: unknown, fallback = 'Erreur serveur'): NextResponse {
  const e = (err ?? {}) as PgLikeError;
  const message = typeof err === 'string' ? err : e.message ?? '';
  console.error(`[api] ${context} :`, message || err);

  const code = e.code ?? '';
  if (code === '23505' || /duplicate key/i.test(message)) {
    return NextResponse.json({ error: 'Cet élément existe déjà (valeur en doublon, par exemple un identifiant ou un lien déjà utilisé).' }, { status: 409 });
  }
  if (code === '23503' || /foreign key/i.test(message)) {
    return NextResponse.json({ error: "Opération impossible : cet élément est lié à d'autres données (ou la référence indiquée n'existe pas)." }, { status: 409 });
  }
  if (code === '22P02' || code === '22007' || code === '22008' || /invalid input syntax/i.test(message)) {
    return badRequest('Valeur invalide dans la requête.');
  }
  if (code === '23502' || code === '23514' || /violates (not-null|check)/i.test(message)) {
    return badRequest('Une valeur obligatoire est manquante ou non autorisée.');
  }
  if (code === 'PGRST116' || /no\) rows|cannot coerce|0 rows/i.test(message)) {
    return notFound('Élément introuvable');
  }
  return serverError(fallback);
}

/**
 * Limiteur en mémoire (par processus) : `allow(clé)` renvoie false quand la clé
 * dépasse `max` appels dans la fenêtre. Sans état partagé : suffisant pour
 * freiner une boucle ou un abus sur un serveur unique, pas une défense à
 * l'échelle d'un botnet (celle-ci relève de Cloudflare).
 */
export function createRateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    allow(key: string): boolean {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        if (hits.size > 5000) {
          Array.from(hits.entries()).forEach(([k, v]) => {
            if (v.resetAt <= now) hits.delete(k);
          });
        }
        return true;
      }
      entry.count += 1;
      return entry.count <= max;
    },
    reset(key: string): void {
      hits.delete(key);
    },
  };
}

/**
 * Adresse IP du visiteur. Cloudflare pose cf-connecting-ip (non falsifiable si
 * le serveur n'est joignable que via Cloudflare) ; à défaut x-real-ip, puis la
 * première entrée de x-forwarded-for. Renvoie null si aucune n'est présente —
 * l'appelant ne doit alors PAS regrouper tous les visiteurs sous « unknown ».
 */
export function getClientIp(headers: Headers): string | null {
  const candidates = [
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
    headers.get('x-forwarded-for')?.split(',')[0],
  ];
  for (const c of candidates) {
    const ip = c?.trim();
    // « unknown » est la valeur que posent certains appels internes quand l'IP manque : ce n'est pas une IP.
    if (ip && ip.toLowerCase() !== 'unknown') return ip;
  }
  return null;
}

/** Entier borné depuis un paramètre d'URL ; `fallback` si absent ou illisible. */
export function intParam(value: string | null, fallback: number, min: number, max: number): number {
  if (value === null || value.trim() === '') return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Date AAAA-MM-JJ valide (et réelle : 2026-02-31 est refusé). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Texte nettoyé : chaîne rognée, tronquée à `max`, ou null si vide/non texte. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t ? t.slice(0, max) : null;
}

/** URL http(s) absolue valide. */
export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2000) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Erreur d'un fournisseur d'IA (Gemini / Claude / OpenAI) : le message brut peut contenir un
 * fragment de clé API ou le détail du compte, il n'est donc jamais renvoyé ; l'admin reçoit
 * une explication utile selon le code HTTP du fournisseur.
 */
export function aiErrorResponse(context: string, err: unknown): NextResponse {
  console.error(`[api] ${context} :`, err);
  const status = (err as { status?: number } | null)?.status;
  if (status === 429) {
    return NextResponse.json({ error: "Limite ou quota du service d'IA atteint : réessayez dans quelques minutes (ou vérifiez le crédit du compte)." }, { status: 503 });
  }
  if (status === 401 || status === 403) {
    return NextResponse.json({ error: "Le service d'IA a refusé la clé API : vérifiez-la dans la configuration du serveur." }, { status: 502 });
  }
  return NextResponse.json({ error: 'La génération par IA a échoué. Réessayez dans un instant ; si cela persiste, consultez les logs serveur.' }, { status: 502 });
}
