/**
 * OPF Notification dispatcher
 * Routes price drop alerts through:
 *   1. Brevo transactional email (ready)
 *   2. Web Push — placeholder for PushEngage/OneSignal (coming soon)
 *
 * Brevo API docs: https://developers.brevo.com/reference/sendtransacemail
 */

const BREVO_API = 'https://api.brevo.com/v3';

export interface PriceDropAlert {
  productId: string;  // UUID (Supabase)
  productName: string;
  imageUrl?: string;
  oldPrice: number;
  newPrice: number;
  marketId: string;
  affiliateUrl: string;
  currency: string;
  currencySymbol: string;
  category?: string;
}

// ---------------------------------------------------------------------------
// Email via Brevo
// ---------------------------------------------------------------------------

function buildEmailHtml(alert: PriceDropAlert, dropPct: number): string {
  const { productName, oldPrice, newPrice, currencySymbol, affiliateUrl, marketId, imageUrl } = alert;
  const marketFlag = { fr: '🇫🇷', es: '🇪🇸', com: '🌍' }[marketId] ?? '';
  const domain = { fr: 'tendpick.fr', es: 'tendpick.es', com: 'tendpick.com' }[marketId] ?? 'tendpick.fr';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerte prix Tendpick</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;text-align:center;">
            <div style="font-size:28px;margin-bottom:4px;">🎯</div>
            <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
              Alerte Prix Tendpick
            </h1>
            <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">Marché ${marketFlag} ${marketId.toUpperCase()}</p>
          </td>
        </tr>

        <!-- Product image (optional) -->
        ${imageUrl ? `
        <tr>
          <td style="padding:24px 32px 0;text-align:center;">
            <img src="${imageUrl}" alt="${productName}"
                 style="max-height:200px;max-width:300px;object-fit:contain;border-radius:8px;">
          </td>
        </tr>` : ''}

        <!-- Product name -->
        <tr>
          <td style="padding:24px 32px 16px;">
            <h2 style="margin:0;font-size:18px;color:#111827;font-weight:600;line-height:1.4;">
              ${productName}
            </h2>
          </td>
        </tr>

        <!-- Price comparison -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:16px 24px;border-bottom:1px solid #e5e7eb;">
                  <span style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Ancien prix</span><br>
                  <span style="font-size:22px;color:#ef4444;text-decoration:line-through;font-weight:600;">
                    ${currencySymbol}${oldPrice.toFixed(2)}
                  </span>
                </td>
                <td style="padding:16px 24px;border-bottom:1px solid #e5e7eb;text-align:right;">
                  <span style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Nouveau prix</span><br>
                  <span style="font-size:30px;color:#16a34a;font-weight:800;">
                    ${currencySymbol}${newPrice.toFixed(2)}
                  </span>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:12px 24px;text-align:center;">
                  <span style="display:inline-block;background:#dcfce7;color:#166534;font-weight:700;font-size:16px;padding:6px 20px;border-radius:999px;">
                    −${dropPct}% d'économie
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <a href="${affiliateUrl}"
               style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;
                      font-weight:700;font-size:16px;padding:16px 40px;border-radius:12px;
                      letter-spacing:0.2px;">
              Voir l'offre →
            </a>
            <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">
              Cette offre peut expirer à tout moment. Les prix peuvent varier.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:12px;color:#6b7280;">
              <a href="https://${domain}" style="color:#2563eb;text-decoration:none;font-weight:600;">Tendpick.${marketId}</a>
              — Vos meilleures sélections produits
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendBrevoEmail(
  to: string,
  subject: string,
  html: string,
  apiKey: string
): Promise<void> {
  const payload = {
    sender: { name: 'Tendpick Alerts', email: 'contact@tendpick.fr' },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  const res = await fetch(`${BREVO_API}/smtp/email`, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Brevo] Email error: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Web Push (placeholder — wire up OneSignal/PushEngage later)
// ---------------------------------------------------------------------------

async function sendWebPush(_alert: PriceDropAlert, _dropPct: number): Promise<void> {
  // TODO: integrate OneSignal or PushEngage
  // const res = await fetch('https://onesignal.com/api/v1/notifications', {
  //   method: 'POST',
  //   headers: { Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}` },
  //   body: JSON.stringify({
  //     app_id: process.env.ONESIGNAL_APP_ID,
  //     included_segments: ['All'],
  //     headings: { en: `${_alert.productName} dropped ${_dropPct}%!` },
  //     contents: { en: `Now ${_alert.currencySymbol}${_alert.newPrice.toFixed(2)}` },
  //     url: _alert.affiliateUrl,
  //   }),
  // });
  console.log('[WebPush] Placeholder — configure OneSignal to enable push notifications');
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

/**
 * Send a price drop alert via all configured channels.
 * Only sends if the price drop is >= the threshold percentage.
 */
export async function dispatchPriceAlert(
  alert: PriceDropAlert,
  thresholdPct = 5
): Promise<{ sent: boolean; channel: string[]; dropPct: number }> {
  const dropPct = Math.round(
    ((alert.oldPrice - alert.newPrice) / alert.oldPrice) * 100
  );

  if (dropPct < thresholdPct) {
    return { sent: false, channel: [], dropPct };
  }

  const channels: string[] = [];
  const subject = `🔥 −${dropPct}% sur ${alert.productName} (${alert.currencySymbol}${alert.newPrice.toFixed(2)})`;
  const html = buildEmailHtml(alert, dropPct);

  // 1. Email via Brevo
  const brevoKey = process.env.BREVO_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL ?? 'jeromechili@gmail.com';
  if (brevoKey) {
    try {
      await sendBrevoEmail(adminEmail, subject, html, brevoKey);
      channels.push('email');
      console.log(`[OPF Notify] Email sent for product #${alert.productId} (−${dropPct}%)`);
    } catch (err) {
      console.error('[OPF Notify] Email failed:', err);
    }
  }

  // 2. Web Push (placeholder)
  try {
    await sendWebPush(alert, dropPct);
    // channels.push('push'); // uncomment when wired up
  } catch (err) {
    console.error('[OPF Notify] Push failed:', err);
  }

  return { sent: channels.length > 0, channel: channels, dropPct };
}
