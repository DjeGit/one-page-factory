/**
 * Client Brevo partagé — remplace les appels fetch() dupliqués vus dans
 * app/api/leads/route.ts et lib/opf-notify.ts par un point d'entrée unique
 * pour le nouveau code (module nurture). Le code existant (capture de
 * leads, alertes prix) n'est volontairement pas migré ici : il fonctionne,
 * on ne le touche pas dans ce sprint.
 */

const BREVO_BASE = 'https://api.brevo.com/v3';

export function isBrevoConfigured(): boolean {
  return !!process.env.BREVO_API_KEY;
}

function getApiKey(): string {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('BREVO_API_KEY non configurée');
  return key;
}

export interface BrevoContactUpsert {
  email: string;
  listIds?: number[];
  attributes?: Record<string, unknown>;
}

/**
 * Crée ou met à jour un contact Brevo (updateEnabled: true — ne duplique
 * jamais un contact existant, complète son profil et ses listes).
 * Retourne { ok: false } silencieusement si BREVO_API_KEY n'est pas
 * configurée, plutôt que de lever une exception — cohérent avec le
 * comportement du code de capture de leads existant.
 */
export async function upsertBrevoContact(payload: BrevoContactUpsert): Promise<{ ok: boolean; status: number }> {
  if (!isBrevoConfigured()) return { ok: false, status: 0 };
  try {
    const res = await fetch(`${BREVO_BASE}/contacts`, {
      method: 'POST',
      headers: { 'api-key': getApiKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email,
        updateEnabled: true,
        ...(payload.listIds ? { listIds: payload.listIds } : {}),
        ...(payload.attributes ? { attributes: payload.attributes } : {}),
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** Retire un contact d'une liste Brevo (désinscription d'une séquence). */
export async function removeBrevoContactFromList(email: string, listId: number): Promise<{ ok: boolean; status: number }> {
  if (!isBrevoConfigured()) return { ok: false, status: 0 };
  try {
    const res = await fetch(`${BREVO_BASE}/contacts/lists/${listId}/contacts/remove`, {
      method: 'POST',
      headers: { 'api-key': getApiKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: [email] }),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

export interface SendTransactionalEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  senderEmail?: string;
  senderName?: string;
  replyTo?: string;
}

/**
 * Envoie un email transactionnel via Brevo (POST /smtp/email). Utilisé
 * par l'admin pour écrire à un contact du Répertoire (client, fournisseur,
 * partenaire) depuis l'app plutôt que via mailto: — voir
 * app/api/leads/[id]/send-email/route.ts. Expéditeur par défaut :
 * contact@tendpick.com, authentifié (DKIM+DMARC) et vérifié côté Brevo
 * depuis le 22/09. Contrairement à upsertBrevoContact/removeBrevoContactFromList,
 * lève une exception en cas d'échec plutôt que de retourner { ok: false }
 * silencieusement : ici l'appelant doit savoir si l'email est réellement
 * parti pour l'enregistrer correctement dans contact_emails (status
 * 'sent' vs 'failed').
 */
export async function sendTransactionalEmail(params: SendTransactionalEmailParams): Promise<void> {
  if (!isBrevoConfigured()) {
    throw new Error('BREVO_API_KEY non configurée');
  }
  const senderEmail = params.senderEmail ?? 'contact@tendpick.com';
  const senderName = params.senderName ?? 'Tendpick';
  const res = await fetch(`${BREVO_BASE}/smtp/email`, {
    method: 'POST',
    headers: { 'api-key': getApiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: params.to }],
      ...(params.replyTo ? { replyTo: { email: params.replyTo } } : {}),
      subject: params.subject,
      htmlContent: params.htmlContent,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`[Brevo] Échec de l'envoi (${res.status}) : ${errText}`);
  }
}
