// Caractéristiques de l'annonce AliExpress (tableau « Specifications ») lues sur la page produit.
// Elles servent de faits supplémentaires pour les textes. Elles peuvent être fausses : le prompt demande de les recouper avec le titre.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const EMPTY = /^(n\/a|none|null|other|no|aucun|-|—|\s*)$/i;

const unescapeJson = (s) => {
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s;
  }
};

/** Paires nom/valeur du tableau de caractéristiques, dans l'ordre de la page, sans doublon. */
export function extractSpecs(html) {
  const out = [];
  const seen = new Set();
  const add = (n, v) => {
    const name = unescapeJson(n).trim();
    const value = unescapeJson(v).replace(/\s+/g, ' ').trim();
    if (!name || !value || EMPTY.test(value) || value.length > 200 || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    out.push({ name, value });
  };
  for (const m of String(html).matchAll(/"attrName"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"attrValue"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) add(m[1], m[2]);
  if (!out.length) {
    for (const m of String(html).matchAll(/"name"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"value"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) add(m[1], m[2]);
  }
  return out;
}

/** Noms de clés JSON qui ressemblent à des caractéristiques (pour le diagnostic). */
export function specKeyNames(html) {
  return [...new Set([...String(html).matchAll(/"([A-Za-z]*(?:Prop|Spec|Attr)[A-Za-z]*)"\s*:/g)].map((m) => m[1]))].slice(0, 30);
}

export async function fetchItemHtml(aliexpressId, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`https://www.aliexpress.com/item/${aliexpressId}.html`, {
    headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`page produit HTTP ${res.status}`);
  return res.text();
}

export async function fetchSpecs(aliexpressId, opts = {}) {
  return extractSpecs(await fetchItemHtml(aliexpressId, opts));
}

/** Texte prêt à mettre dans le prompt (au plus `max` lignes). */
export function formatSpecs(specs, max = 25) {
  return (specs || []).slice(0, max).map((s) => `- ${s.name} : ${s.value}`).join('\n');
}
