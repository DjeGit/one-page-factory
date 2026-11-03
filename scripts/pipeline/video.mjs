// Recherche automatique d'une vidéo YouTube (test ou présentation) pour une fiche produit.
// Prudence avant tout : une mauvaise vidéo est pire que pas de vidéo. On ne garde un résultat que si
//  - le produit a un repère précis (modèle : « 7800X3D », « Forerunner 265 », « OpenRun Pro 2 »…), sinon on ne cherche pas ;
//  - le titre de la vidéo contient ce repère et une bonne part des mots du nom du produit ;
//  - la vidéo est publique, intégrable sur un autre site et dure entre 1 et 25 minutes.
// Clé : YOUTUBE_API_KEY (YouTube Data API v3). Sans clé, la recherche est simplement inactive.

const STOP = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'et', 'pour', 'avec', 'sans', 'en', 'un', 'une', 'au', 'aux',
  'el', 'los', 'las', 'y', 'con', 'sin', 'para', 'por', 'del', 'un', 'una',
  'the', 'and', 'for', 'with', 'without', 'of', 'a', 'an', 'in', 'to',
]);

const MARKET_SEARCH = {
  fr: { lang: 'fr', region: 'FR', words: 'test avis' },
  es: { lang: 'es', region: 'ES', words: 'análisis review' },
  uk: { lang: 'en', region: 'GB', words: 'review' },
};

const MIN_SECONDS = 60;
const MAX_SECONDS = 25 * 60;

export const strip = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Mots significatifs d'un nom de produit (sans accents, sans mots vides, sans doublons). */
export function tokens(name) {
  const out = [];
  for (const t of strip(name).split(/[^a-z0-9]+/)) {
    if (t.length < 2 || STOP.has(t) || out.includes(t)) continue;
    out.push(t);
  }
  return out;
}

/** Repères de modèle : mots mêlant lettres et chiffres (« 7800x3d ») ou nombres d'au moins 3 chiffres (« 265 », « 3070 »). */
export function modelTokens(name) {
  return tokens(name).filter((t) => (/\d/.test(t) && /[a-z]/.test(t) && t.length >= 3) || /^\d{3,}$/.test(t));
}

/** Durée ISO 8601 (« PT12M30S ») → secondes. */
export function parseDuration(iso) {
  const m = String(iso || '').match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  return (Number(m[1] || 0) * 24 + Number(m[2] || 0)) * 3600 + Number(m[3] || 0) * 60 + Number(m[4] || 0);
}

/** Note de ressemblance entre le nom du produit et le titre d'une vidéo, ou null si elle ne convient pas. */
export function scoreTitle(name, title) {
  const wanted = tokens(name);
  const models = modelTokens(name);
  if (!models.length || wanted.length < 2) return null;
  const compact = strip(title).replace(/[^a-z0-9]/g, '');
  const have = new Set(tokens(title));
  const matched = wanted.filter((t) => have.has(t) || compact.includes(t));
  if (!models.some((t) => compact.includes(t))) return null;
  const ratio = matched.length / wanted.length;
  return ratio >= 0.5 ? ratio : null;
}

async function getJson(url, fetchImpl) {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`YouTube ${res.status}`);
  return res.json();
}

/**
 * @param {{name:string, market:'fr'|'es'|'uk'}} q
 * @returns {Promise<{url:string,title:string,channel:string,views:number}|null>}
 */
export async function findVideo({ name, market }, { apiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('YOUTUBE_API_KEY absente');
  const cfg = MARKET_SEARCH[market];
  if (!cfg) throw new Error(`marché inconnu : ${market}`);
  if (!modelTokens(name).length) return null; // produit sans repère précis : aucune vidéo fiable possible

  const base = 'https://www.googleapis.com/youtube/v3';
  const search = new URLSearchParams({
    part: 'snippet', type: 'video', maxResults: '10', videoEmbeddable: 'true', safeSearch: 'moderate',
    relevanceLanguage: cfg.lang, regionCode: cfg.region, q: `${name} ${cfg.words}`, key: apiKey,
  });
  const found = await getJson(`${base}/search?${search}`, fetchImpl);
  const ids = (found.items || []).map((i) => i?.id?.videoId).filter(Boolean);
  if (!ids.length) return null;
  const details = await getJson(`${base}/videos?${new URLSearchParams({ part: 'contentDetails,status,statistics,snippet', id: ids.join(','), key: apiKey })}`, fetchImpl);

  let best = null;
  for (const v of details.items || []) {
    const seconds = parseDuration(v.contentDetails?.duration);
    if (!v.status?.embeddable || v.status?.privacyStatus !== 'public') continue;
    if (seconds < MIN_SECONDS || seconds > MAX_SECONDS) continue;
    const ratio = scoreTitle(name, v.snippet?.title);
    if (ratio == null) continue;
    const views = Number(v.statistics?.viewCount || 0);
    const score = ratio * 100 + Math.log10(views + 1) * 5;
    if (!best || score > best.score) best = { score, url: `https://www.youtube.com/watch?v=${v.id}`, title: v.snippet?.title || '', channel: v.snippet?.channelTitle || '', views };
  }
  if (!best) return null;
  const { score, ...result } = best;
  return result;
}
