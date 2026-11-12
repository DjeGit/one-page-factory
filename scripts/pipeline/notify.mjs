// Emails du flux automatique (Brevo, transactionnel). Aucune exception : un email raté ne doit jamais bloquer le flux.
// Aucun secret dans le contenu : seulement le nom du produit, les fiches et la raison (déjà passée par redact()).
import { when } from './report.mjs';

export const NOTIFY_TO = 'onepagefactory.pro@gmail.com';
const SENDER = { name: 'Tendpick Alerts', email: 'contact@tendpick.com' };
const ADMIN_PRODUCTS = 'https://tendpick.com/admin/products';
const ADMIN_TRENDS = 'https://tendpick.com/admin/market/trends';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pct = (r) => (r == null ? '—' : `${(Number(r) * 100).toFixed(1).replace('.0', '')} %`);

function page(title, body) {
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:24px;background:#f3f4f6;font-family:Segoe UI,Arial,sans-serif;color:#111827">
<div style="max-width:620px;margin:0 auto;background:#fff;border-radius:12px;padding:24px">
<h1 style="font-size:18px;margin:0 0 16px">${esc(title)}</h1>${body}
<p style="margin-top:24px;font-size:12px;color:#6b7280">Flux automatique Tendpick · <a href="${ADMIN_TRENDS}">page Tendance</a> · <a href="${ADMIN_PRODUCTS}">produits</a></p></div></body></html>`;
}

function table(products) {
  const rows = products
    .map((p) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb">${esc(String(p.market).toUpperCase())}</td><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb">${esc(p.name)}<br><span style="color:#6b7280;font-size:12px">${esc(p.slug)}</span></td><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;white-space:nowrap">${esc(p.price)} ${esc(p.currency)}</td><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb">${pct(p.commission_rate)}</td></tr>`)
    .join('');
  return `<table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="text-align:left;color:#6b7280"><th style="padding:4px 8px">Marché</th><th style="padding:4px 8px">Fiche</th><th style="padding:4px 8px">Prix</th><th style="padding:4px 8px">Commission</th></tr>${rows}</table>`;
}

const list = (items) => (items?.length ? `<ul style="padding-left:18px;margin:8px 0">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '');

/**
 * @param {{kind:'ready'|'live'|'problem', candidate:{name:string,aliexpress_id:string}, products?:object[], photos?:number, publishAt?:Date|string, holdReason?:string|null, skipped?:{market:string,reasons:string[]}[], summary?:string[], warnings?:string[], error?:string}} d
 */
export function renderEmail(d) {
  if (d.kind === 'trends') return renderTrendsEmail(d.result);
  if (d.kind === 'videos') return renderVideosEmail(d.result);
  const name = d.candidate.name;
  if (d.kind === 'problem') {
    const body = `<p>Le produit <b>${esc(name)}</b> (AliExpress ${esc(d.candidate.aliexpress_id)}) n'a pas pu être traité automatiquement.</p>
<p style="background:#fef2f2;padding:10px;border-radius:8px"><b>Raison :</b> ${esc(d.error)}</p>${list(d.warnings)}
${d.products?.length ? `<p>Fiches déjà créées (en brouillon) :</p>${table(d.products)}` : ''}
<p>Rien n'est publié. Une fois la cause réglée, remets le produit sur OUI dans la page Tendance pour relancer.</p>`;
    return { subject: `[Tendpick] À traiter : ${name}`, html: page('Produit à traiter', body) };
  }
  if (d.kind === 'live') {
    const body = `<p>Le produit <b>${esc(name)}</b> est <b>en ligne</b> sur ${d.products.length} marché(s).</p>${table(d.products)}${list(d.warnings)}`;
    return { subject: `[Tendpick] En ligne : ${name}`, html: page('Fiche mise en ligne', body) };
  }
  const summary = d.summary?.length ? `<p style="margin:12px 0 4px"><b>Résumé</b></p>${list(d.summary)}` : '';
  const hold = d.holdReason ? `<p style="background:#fffbeb;padding:10px;border-radius:8px"><b>Mise en ligne non automatique :</b> ${esc(d.holdReason)}. Active la fiche toi-même dans l'admin après vérification.</p>` : `<p>Mise en ligne automatique : <b>${esc(when(d.publishAt))}</b>. Pour annuler, remets le produit sur NON dans la page Tendance avant cette heure.</p>`;
  const skipped = d.skipped?.length ? `<p>Marchés non créés :</p>${list(d.skipped.map((s) => `${s.market.toUpperCase()} : ${s.reasons.join(' ; ')}`))}` : '';
  const body = `<p>La fiche <b>${esc(name)}</b> est prête (liens affiliés vérifiés, ${d.photos ?? 0} photos, textes rédigés).</p>${table(d.products)}${summary}${skipped}${hold}
<p style="font-size:13px;color:#374151">Relis surtout les textes : ils sont rédigés automatiquement à partir du titre de l'annonce.</p>${list(d.warnings)}`;
  return { subject: `[Tendpick] Fiche prête : ${name}`, html: page('Fiche prête', body) };
}

/** Récapitulatif de la recherche hebdomadaire (scripts/pipeline/trend-search.mjs). */
function renderTrendsEmail(r) {
  if (r.error) {
    const body = `<p>La recherche hebdomadaire de la semaine du <b>${esc(r.week)}</b> n'a pas abouti.</p>
<p style="background:#fef2f2;padding:10px;border-radius:8px"><b>Raison :</b> ${esc(r.error)}</p>${list(r.warnings)}
<p>Rien n'a été modifié dans la page Tendance. Tu peux relancer sur le serveur : <code>./pipeline-cron.sh trend-search --force</code></p>`;
    return { subject: '[Tendpick] Recherche hebdomadaire : échec', html: page('Recherche hebdomadaire en échec', body) };
  }
  const rows = (r.summary || []).map((s) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb">${esc(s.label)}</td><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${esc(s.kept)}</td><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;color:#6b7280">${s.ranked ? 'choix de Claude' : 'classement calculé'}</td></tr>`).join('');
  const body = `<p><b>${esc(r.created)} nouveaux produits</b> t'attendent dans la page Tendance (semaine du ${esc(r.week)}). Dis OUI ou NON : les OUI sont traités automatiquement.</p>
<table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="text-align:left;color:#6b7280"><th style="padding:4px 8px">Catégorie</th><th style="padding:4px 8px;text-align:right">Produits</th><th style="padding:4px 8px"></th></tr>${rows}</table>
${list(r.warnings)}${r.failed?.length ? `<p>Non enregistrés :</p>${list(r.failed)}` : ''}
<p style="font-size:13px;color:#374151">${esc(r.purged ?? 0)} ancien(s) candidat(s) non décidé(s) supprimé(s). La livraison gratuite n'est pas fournie par l'API : elle reste à relever avant de valider.</p>`;
  return { subject: `[Tendpick] ${r.created} nouvelles tendances à valider`, html: page('Nouvelles tendances à valider', body) };
}

/** Récapitulatif du rattrapage des vidéos (scripts/pipeline/video-backfill.mjs). */
function renderVideosEmail(r) {
  const body = `<p>Rattrapage des vidéos : <b>${esc(r.found)}</b> vidéo(s) ajoutée(s) sur ${esc(r.checked)} fiche(s) sans vidéo.</p>${list(r.lines)}`;
  return { subject: `[Tendpick] Vidéos : ${r.found} ajoutée(s)`, html: page('Vidéos ajoutées aux fiches', body) };
}

/** Envoie un email via Brevo. Ne lève jamais d'exception. @returns {{ok:boolean,status:number,error?:string}} */
export async function sendMail({ subject, html }, { apiKey = process.env.BREVO_API_KEY, to = process.env.PIPELINE_NOTIFY_EMAIL || NOTIFY_TO, fetchImpl = fetch } = {}) {
  if (!apiKey) return { ok: false, status: 0, error: 'clé Brevo (BREVO_API_KEY) absente' };
  try {
    const res = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: SENDER, to: [{ email: to }], subject, htmlContent: html }),
      signal: AbortSignal.timeout(20000),
    });
    return res.ok ? { ok: true, status: res.status } : { ok: false, status: res.status, error: `Brevo a répondu ${res.status}` };
  } catch (e) {
    return { ok: false, status: 0, error: `Brevo injoignable (${e?.name === 'TimeoutError' ? 'délai dépassé' : 'réseau'})` };
  }
}
