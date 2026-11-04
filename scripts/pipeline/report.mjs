// Textes lisibles par un non-développeur : résumé d'un produit traité (journal du worker et email).
// Fonctions pures, testées sans réseau.

export const when = (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Europe/Madrid', dateStyle: 'full', timeStyle: 'short' });

const upper = (m) => String(m).toUpperCase();
const list = (ms) => ms.map(upper).join(', ');

/**
 * Bilan des photos d'un produit.
 * @param {object|null|undefined} report  rapport de scripts/photos/pipeline.mjs (processProduct)
 * @param {number} kept  nombre de photos retenues
 */
export function photoStats(report, kept) {
  const r = report || {};
  const fetched = Number(r.fetched) || 0;
  const rejectedByAi = (r.rejected || []).filter((x) => x?.note !== 'doublon visuel').length;
  return {
    kept,
    fetched,
    discarded: Math.max(0, fetched - kept),
    tooSmall: Number(r.tooSmall) || 0,
    duplicates: Number(r.duplicates) || 0,
    rejectedByAi,
    failedDownloads: (r.failed || []).length,
    known: fetched > 0,
  };
}

export function describePhotos(s) {
  if (!s.known) return `${s.kept} retenue(s)`;
  const why = [
    s.rejectedByAi && `${s.rejectedByAi} refusée(s) par le tri (promo, texte, emballage…)`,
    s.duplicates && `${s.duplicates} doublon(s)`,
    s.tooSmall && `${s.tooSmall} trop petite(s)`,
    s.failedDownloads && `${s.failedDownloads} non téléchargée(s)`,
  ].filter(Boolean);
  return `${s.kept} retenue(s) sur ${s.fetched} téléchargée(s), ${s.discarded} écartée(s)${why.length ? ` (${why.join(', ')})` : ''}`;
}

/** Libellé de l'état de la vidéo d'un marché. */
export const VIDEO_LABEL = { found: 'trouvée', existing: 'déjà présente', none: 'aucune vidéo fiable', error: 'recherche impossible', off: 'recherche inactive' };
export const SHIPPING_LABEL = { free: 'gratuite', paid: 'payante (relevée)', unknown: 'à vérifier' };

/**
 * @param {{offers:object[], photos:object|null, videos:Record<string,string>, shipping:Record<string,string>, publishAt?:Date|null, hold?:string|null}} a
 * @returns {string[]} lignes du résumé
 */
export function summaryLines({ offers, photos, videos, shipping, publishAt, hold }) {
  const ok = offers.filter((o) => o.status === 'ok').map((o) => o.market);
  const out = [];
  out.push(`Marchés prêts : ${ok.length ? list(ok) : 'aucun'}`);
  const ko = offers.filter((o) => o.status !== 'ok');
  if (ko.length) out.push(`Marchés indisponibles : ${ko.map((o) => `${upper(o.market)} (${o.reasons.join(' ; ')})`).join(' | ')}`);
  if (photos) out.push(`Photos : ${describePhotos(photos)}`);
  const v = ok.filter((m) => videos[m]).map((m) => `${upper(m)} ${VIDEO_LABEL[videos[m]] || videos[m]}`);
  if (v.length) out.push(`Vidéo : ${v.join(', ')}`);
  const s = ok.filter((m) => shipping[m]).map((m) => `${upper(m)} ${SHIPPING_LABEL[shipping[m]] || shipping[m]}`);
  if (s.length) out.push(`Livraison gratuite : ${s.join(', ')}`);
  out.push(hold ? `Mise en ligne : manuelle (${hold})` : publishAt ? `Mise en ligne prévue : ${when(publishAt)} (heure de Madrid)` : 'Mise en ligne : à décider');
  return out;
}
