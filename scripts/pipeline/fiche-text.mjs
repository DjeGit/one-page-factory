// Rédaction automatique d'une fiche (une langue) : consigne éditoriale Tendpick, appel du modèle, validation stricte.
// Le modèle n'a pour faits que ceux de l'annonce : il n'invente aucune caractéristique chiffrée.

export const LANGS = {
  fr: { market: 'fr', label: 'français', tu: 'tutoiement (« tu »)', warranty: 'Produit garanti', warrantyRe: /garanti/i, medical: 'Ne remplace pas un appareil médical.' },
  es: { market: 'es', label: "espagnol d'Espagne", tu: 'tutoiement (« tú »)', warranty: 'Producto garantizado', warrantyRe: /garantizad/i, medical: 'No sustituye a un dispositivo médico.' },
  en: { market: 'uk', label: 'anglais britannique', tu: 'ton direct (« you »)', warranty: 'Warranty as stated in the offer', warrantyRe: /warranty/i, medical: 'Not a substitute for a medical device.' },
};

const MONTHS = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export function longDate(lang, iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const mo = MONTHS[lang][m - 1];
  if (lang === 'fr') return `${d} ${mo} ${y}`;
  if (lang === 'es') return `${d} de ${mo} de ${y}`;
  return `${d} ${mo} ${y}`;
}

export function fmtPrice(lang, price) {
  const n = Number(price).toFixed(2);
  return lang === 'en' ? `£${n}` : `${n.replace('.', ',')} €`;
}

const DELIV = {
  fr: ['Livraison et retours : comment ça marche ?', 'Les délais, frais de livraison et conditions de retour sont indiqués sur la page de l’offre et peuvent varier : consulte-les avant de commander.'],
  es: ['¿Cómo funcionan el envío y las devoluciones?', 'Los plazos, los gastos de envío y las condiciones de devolución figuran en la página de la oferta y pueden variar: consúltalos antes de pedir.'],
  en: ['How do delivery and returns work?', 'Delivery times, shipping costs, import charges and return conditions are shown on the offer page and may vary: check them before ordering.'],
};

/** Les deux questions fixes (livraison, prix daté) ajoutées à la FAQ rédigée par le modèle. */
export function fixedFaq(lang, price, isoDate) {
  const p = fmtPrice(lang, price);
  const d = longDate(lang, isoDate);
  const priceQ =
    lang === 'fr'
      ? ['Quel est le prix ?', `Le prix affiché (${p}) a été relevé chez le marchand le ${d}. Il varie avec les offres et les coupons : confirme-le avec le revendeur avant d’acheter.`]
      : lang === 'es'
        ? ['¿Cuál es el precio?', `El precio mostrado (${p}) se registró en la tienda el ${d}. Varía con las ofertas y los cupones: confírmalo con el vendedor antes de comprar.`]
        : ['How much does it cost?', `The price shown (${p}) was recorded at the merchant on ${d}. It changes with offers and coupons: confirm it with the seller before you buy.`];
  return [DELIV[lang], priceQ].map(([question, answer]) => ({ question, answer }));
}

const BANNED = [
  [/ali ?express/i, 'mention d’AliExpress (déjà affichée par le site)'],
  [/d['’]apr[eè]s les (acheteurs|clients|avis)|les (acheteurs|clients) (signalent|disent|rapportent|confirment)|selon (la fiche|les avis|les acheteurs)|seg[uú]n (los )?(compradores|clientes|opiniones|la ficha)|according to (the )?(buyers|customers|reviews)|(buyers|customers) (report|say|confirm)/i, 'commentaire sur les acheteurs ou les avis'],
  [/bo[iî]te d['’]origine|autocollants?|version chinoise|non test[ée]|pas test[ée]|contrefa|counterfeit|original box|chinese version|falsific|caja original|versi[oó]n china/i, 'jugement sur l’authenticité'],
  [/stock limit|derni[eè]res? (pi[eè]ces|unit[eé]s)|d[eé]p[eê]che|offre limit|plus que \d+|only \d+ left|last chance|[uú]ltimas unidades|oferta limitada|date limite/i, 'urgence ou stock fictif'],
  [/\d+[.,]?\d*\s?(€|eur\b|euros?|£|gbp|pounds?)/i, 'prix dans le texte (il est affiché par le site)'],
  [/\bsoulag\w*|\bgu[eé]ri\w*|\balivia\w*|\bcura\b|\bsana\b|\brelieves?\b|\bheals?\b|\bcures?\b/i, 'promesse de santé (décris la fonction, pas un effet)'],
];

const trim = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
/** Coupe à la limite sur une frontière de mot. */
export function fit(s, max) {
  const t = trim(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const i = cut.lastIndexOf(' ');
  return (i > max * 0.4 ? cut.slice(0, i) : cut).replace(/[\s,;:–—-]+$/, '');
}

/** Contrôle et normalise la réponse du modèle. @returns {{ok:boolean, errors:string[], text?:object}} */
export function validateFicheText(raw, lang) {
  const errors = [];
  const L = LANGS[lang];
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['réponse non exploitable'] };
  const name = trim(raw.name);
  const hero = trim(raw.hero_title);
  const sub = trim(raw.hero_subtitle);
  const paragraphs = String(raw.description ?? '').split(/\n\s*\n/).map(trim).filter(Boolean);
  const benefits = (Array.isArray(raw.benefits) ? raw.benefits : [])
    .map((b) => ({ icon: trim(b?.icon), title: trim(b?.title), description: trim(b?.description) }))
    .filter((b) => b.title && b.description);
  const faq = (Array.isArray(raw.faq) ? raw.faq : []).map((f) => ({ question: trim(f?.question), answer: trim(f?.answer) })).filter((f) => f.question && f.answer);

  if (!name || name.length > 110) errors.push('nom absent ou trop long');
  if (!hero) errors.push('titre d’accroche absent');
  if (!sub) errors.push('sous-titre absent');
  if (paragraphs.length < 2) errors.push('la description doit avoir au moins 2 paragraphes');
  if (benefits.length < 5) errors.push(`il faut au moins 5 bénéfices (reçu ${benefits.length})`);
  if (benefits.some((b) => !b.icon)) errors.push('chaque bénéfice doit avoir une icône (emoji)');
  if (faq.length < 3) errors.push(`il faut au moins 3 questions de FAQ (reçu ${faq.length})`);
  if (!L.warrantyRe.test(paragraphs.join(' '))) errors.push(`la description doit mentionner la garantie (« ${L.warranty} »)`);

  const everything = [name, hero, sub, ...paragraphs, ...benefits.flatMap((b) => [b.title, b.description]), ...faq.flatMap((f) => [f.question, f.answer]), raw.meta_title, raw.meta_description].join(' \n ');
  for (const [re, why] of BANNED) if (re.test(everything)) errors.push(`texte interdit : ${why}`);

  // Méta : le titre est toujours « <nom> | Tendpick » ; la description est coupée en fin de phrase, jamais en plein milieu.
  let metaDescription = trim(raw.meta_description || sub);
  if (metaDescription.length > 155) {
    const cut = metaDescription.slice(0, 155);
    const k = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '), /[.!?]$/.test(cut) ? cut.length - 1 : -1);
    if (k >= 70) metaDescription = cut.slice(0, k + 1);
    else errors.push('meta_description trop longue (155 caractères maximum, phrase complète)');
  }
  if (errors.length) return { ok: false, errors };
  const noDot = (x) => trim(x).replace(/[.\s]+$/, '');
  return {
    ok: true,
    errors: [],
    text: {
      name: noDot(name),
      hero_title: fit(noDot(hero), 100),
      hero_subtitle: fit(sub, 200),
      description: paragraphs.join('\n\n'),
      benefits: benefits.slice(0, 7).map((b) => ({ ...b, title: fit(noDot(b.title), 70) })),
      faq,
      meta_title: `${fit(noDot(name), 48)} | Tendpick`,
      meta_description: metaDescription,
    },
  };
}

export function buildPrompt({ lang, title, categoryLabel, productType, notes, specs }, feedback) {
  const L = LANGS[lang];
  return `Tu rédiges la fiche produit d'un site d'affiliation (Tendpick) en ${L.label}, avec ${L.tu}.

FAITS CONNUS — les seuls que tu peux utiliser :
- Titre de l'annonce : « ${title} »
- Catégorie du site : ${categoryLabel}
${productType ? `- Type de produit : ${productType}\n` : ''}${notes ? `- Notes de recherche : ${notes}\n` : ''}${specs ? `\nCARACTÉRISTIQUES DE L'ANNONCE (peuvent contenir des erreurs : n'utilise que celles cohérentes avec le titre et entre elles ; ignore toute caractéristique douteuse ou contradictoire) :\n${specs}\n` : ''}
RÈGLES ABSOLUES
1. Donne l'information de l'annonce comme un fait, sans commentaire. Jamais « d'après les acheteurs », « selon les avis », « les clients signalent ».
2. N'invente AUCUNE caractéristique : pas de chiffre (autonomie, dimensions, puissance, version, résolution…) qui ne soit pas dans le titre ou les caractéristiques ci-dessus. Si une information manque, reste général (« conçu pour… », « pratique pour… »). Mieux vaut un texte plus court qu'une caractéristique fausse. Si tu connais ce modèle précis avec certitude, tu peux ajouter ses caractéristiques officielles, jamais d'approximation.
3. Aucun jugement sur l'authenticité ou l'origine du produit (ni « boîte d'origine », ni « version chinoise », ni doute sur la garantie).
4. Ne mentionne jamais AliExpress. Ne cite aucun prix, aucune remise, aucune livraison détaillée.
5. Pas d'urgence ni de stock fictif, pas de faux témoignage, pas de « dernières pièces ».
6. Pas de conseils d'achat ni de renvoi vers un autre produit ou revendeur dans la description (ils vont dans la FAQ, sans comparer).
7. Garantie : la description se termine par une phrase de garantie : « ${L.warranty} »${lang === 'en' ? ' (rien d’autre : les règles britanniques diffèrent)' : ''}.
8. Produit pour enfant ou bébé : ne dis jamais qu'il est conforme ou certifié.
9. Aucune promesse de santé ou de performance (« soulage », « guérit », « améliore tes performances », « efficace contre »…) : décris la fonction du produit, jamais un effet sur le corps. Si le produit touche au bien-être ou à la santé (massage, mesure, soin), ajoute juste avant la phrase de garantie : « ${L.medical} »
10. Casse de phrase : majuscule seulement en début de phrase et sur les noms propres (« Pistolet de massage électrique », pas « Pistolet De Massage Électrique »). Pas de point final dans le nom, l'accroche ni les titres de bénéfices.
11. La FAQ ne contient que des questions auxquelles les faits ci-dessus permettent de répondre avec certitude. Pour un détail absent (autonomie, dimensions, contenu de la boîte, compatibilité), ne l'invente pas : pose une autre question, ou réponds que le détail figure sur la page de l'offre.

FORMAT — réponds uniquement par un objet JSON, sans texte autour :
{
 "name": "nom commercial court du produit (marque + modèle + type), sans mots promotionnels",
 "hero_title": "accroche principale (≤ 90 caractères)",
 "hero_subtitle": "sous-titre (≤ 160 caractères)",
 "description": "2 à 3 paragraphes séparés par une ligne vide : présentation et caractéristiques sûres ; usage ; garantie",
 "benefits": [ {"icon": "un emoji", "title": "titre court et concret (≤ 40 caractères)", "description": "une phrase"} ],
 "faq": [ {"question": "…", "answer": "…"} ],
 "meta_description": "une ou deux phrases COMPLÈTES, 155 caractères maximum"
}
Donne 6 bénéfices (les 5 premiers s'affichent sous le titre) et 3 à 4 questions de FAQ factuelles (pour qui, usage, fonctionnement…) — sans question sur le prix ni la livraison, ajoutées automatiquement.${feedback ? `\n\nTA RÉPONSE PRÉCÉDENTE A ÉTÉ REFUSÉE POUR CES RAISONS, corrige-les : ${feedback}` : ''}`;
}

export function parseJsonLoose(text) {
  const t = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf('{');
    const b = t.lastIndexOf('}');
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new Error('réponse non JSON');
  }
}

/** Appel Gemini (clé GEMINI_API_KEY). */
export async function callGemini(prompt, { key = process.env.GEMINI_API_KEY, model = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash', fetchImpl = fetch } = {}) {
  if (!key) throw new Error('GEMINI_API_KEY absente');
  const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 6000, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } },
    }),
    signal: AbortSignal.timeout(120000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status} : ${data?.error?.message || 'erreur'}`);
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) throw new Error(`Gemini : réponse vide (${data.candidates?.[0]?.finishReason || 'inconnue'})`);
  return text;
}

/**
 * Rédige la fiche d'une langue ; une seule nouvelle tentative avec les raisons du refus.
 * @param {{lang:'fr'|'es'|'en', title:string, categoryLabel:string, productType?:string, notes?:string}} input
 * @param {{llm:(prompt:string)=>Promise<string>}} deps
 */
export async function generateFicheText(input, deps) {
  let feedback = '';
  let lastErrors = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    let raw;
    try {
      raw = parseJsonLoose(await deps.llm(buildPrompt(input, feedback)));
    } catch (e) {
      lastErrors = [e.message];
      feedback = e.message;
      continue;
    }
    const v = validateFicheText(raw, input.lang);
    if (v.ok) return { text: v.text, attempts: attempt };
    lastErrors = v.errors;
    feedback = v.errors.join(' ; ');
  }
  throw new Error(`texte ${input.lang} refusé après 2 essais : ${lastErrors.join(' ; ')}`);
}
