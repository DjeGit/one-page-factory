/**
 * /api/leads/[id]/send-email (Admin > Contacts > fiche contact > "Envoyer
 * un mail") — envoi d'un email réel au contact depuis l'admin, via Brevo
 * (expéditeur contact@tendpick.com, authentifié depuis le 22/09).
 * Remplace le lien mailto: qui ouvrait le client mail local de l'admin
 * (voir ancien commentaire dans ContactDetailPanel.tsx). Chaque tentative
 * est journalisée dans contact_emails, y compris en échec, pour que
 * l'admin voie ce qui n'est pas parti.
 *
 * POST body : { subject: string, message: string } — message est du texte
 * brut (zone de saisie simple côté admin), converti en HTML minimal ici.
 * GET — historique des emails envoyés à ce contact (le plus récent en
 * premier), affiché dans ContactDetailPanel.
 */
import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { sendTransactionalEmail } from '@/lib/brevo/client';

const SENDER_EMAIL = 'contact@tendpick.com';
const SENDER_NAME = 'Tendpick';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function textToHtml(subject: string, message: string): string {
  const body = escapeHtml(message).replace(/\n/g, '<br>');
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="padding:32px 32px 8px;">
            <p style="margin:0;font-size:15px;line-height:1.7;color:#1f2937;white-space:pre-wrap;">${body}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 32px;border-top:1px solid #e5e7eb;margin-top:24px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Tendpick — contact@tendpick.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('contact_emails')
    .select('*')
    .eq('contact_id', params.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!subject) return NextResponse.json({ error: "L'objet est requis." }, { status: 400 });
  if (!message) return NextResponse.json({ error: 'Le message est requis.' }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: contact, error: contactError } = await sb
    .from('email_leads')
    .select('id, email')
    .eq('id', params.id)
    .single();

  if (contactError || !contact) {
    return NextResponse.json({ error: 'Contact introuvable.' }, { status: 404 });
  }
  if (!contact.email) {
    return NextResponse.json({ error: 'Ce contact n\'a pas d\'adresse email renseignée.' }, { status: 400 });
  }

  const htmlContent = textToHtml(subject, message);
  let status: 'sent' | 'failed' = 'sent';
  let errorMessage: string | null = null;

  try {
    await sendTransactionalEmail({
      to: contact.email,
      subject,
      htmlContent,
      senderEmail: SENDER_EMAIL,
      senderName: SENDER_NAME,
    });
  } catch (err) {
    status = 'failed';
    errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
  }

  const { data: logEntry, error: logError } = await sb
    .from('contact_emails')
    .insert({
      contact_id: params.id,
      sender_email: SENDER_EMAIL,
      recipient_email: contact.email,
      subject,
      body_html: htmlContent,
      status,
      error: errorMessage,
    })
    .select()
    .single();

  if (status === 'failed') {
    return NextResponse.json(
      { error: errorMessage || "L'envoi a échoué.", data: logEntry },
      { status: 502 }
    );
  }
  if (logError) {
    // L'email est parti mais la journalisation a échoué — ne pas faire
    // croire à l'admin que l'envoi lui-même a échoué.
    return NextResponse.json({ success: true, data: null });
  }
  return NextResponse.json({ success: true, data: logEntry });
}
