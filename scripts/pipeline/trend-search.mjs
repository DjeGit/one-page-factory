#!/usr/bin/env node
// Recherche hebdomadaire automatique des produits tendance (alimente la page « Tendance de la semaine »).
// À lancer une fois par semaine, le lundi matin, sur le serveur :
//   30 4 * * 1   /var/www/one-page-factory/pipeline-cron.sh trend-search >> /var/log/opf-trend-search.log 2>&1
// Essais à la main (depuis le dossier du projet) :
//   node --env-file=.env.local scripts/pipeline/trend-search.mjs --dry-run              (aucune écriture, aucun e-mail : montre ce qui serait proposé)
//   node --env-file=.env.local scripts/pipeline/trend-search.mjs --dry-run --category tech
//   node --env-file=.env.local scripts/pipeline/trend-search.mjs --force                (refait la recherche même si la semaine est déjà remplie)
//
// Déroulement, pour chaque catégorie :
//   1) recherche par mots-clés sur l'API officielle AliExpress (tri : les plus commandés), vue depuis la France ;
//   2) filtres : note (4,5 sur 5, jusqu'à 4,0 si la catégorie manque de produits), commandes récentes, fourchette de prix
//      (ni les prix les plus bas, ni dix fois la médiane), produits déjà en ligne ou récemment refusés écartés ;
//   3) classement : une note calculée (commission x prix x popularité x note) garde les 25 meilleurs, puis Claude en choisit 10
//      avec une phrase d'explication (colonne « note » de la page Tendance). Sans Claude (crédit épuisé…), on garde les 10 premiers de la note calculée ;
//   4) prix et commission relevés sur les 3 marchés (FR, ES, UK) : un produit absent d'un marché n'y sera pas proposé ;
//   5) enregistrement dans trend_candidates (semaine = lundi courant), sans jamais toucher à une décision déjà prise ;
//   6) les candidats non décidés des semaines précédentes sont supprimés (les refusés restent archivés), seulement si la recherche a réussi ;
//   7) un e-mail récapitulatif part sur onepagefactory.pro@gmail.com.
// Rien n'est jamais mis en ligne ici : c'est toi qui dis OUI ou NON dans la page Tendance.
import { fileURLToPath } from 'node:url';
import { CURRENCY, MARKETS } from './offers.mjs';
import { redact } from './safe.mjs';

export const CATEGORY_LABELS = {
  tech: 'Tech', 'mode-beaute': 'Mode & Beauté', 'maison-deco': 'Maison & Déco', 'sport-bien-etre': 'Sport & Bien-être',
  'art-design': 'Art & Design', loisirs: 'Loisirs', 'jeux-jouets': 'Jeux & Jouets', puericulture: 'Bébé & Puériculture',
};

/** Mots-clés (anglais : c'est la langue où AliExpress renvoie le plus de résultats) interrogés pour chaque catégorie. À ajuster librement. */
export const CATEGORY_QUERIES = {
  tech: ['smart watch', 'smart glasses', 'wireless earbuds', 'graphics card', 'mini projector', 'power bank'],
  'mode-beaute': ['led face mask', 'hair straightener brush', 'electric facial cleanser', 'jewelry set', 'eyelash curler heated'],
  'maison-deco': ['robot vacuum cleaner', 'led strip lights', 'air fryer', 'smart plug', 'humidifier'],
  'sport-bien-etre': ['massage gun', 'resistance bands', 'yoga mat', 'smart jump rope', 'neck massager'],
  'art-design': ['diamond painting kit', 'drawing tablet', '3d printing pen', 'acrylic paint set', 'sketchbook set'],
  loisirs: ['camping lantern', 'fishing reel', 'foldable drone', 'binoculars', 'portable speaker'],
  'jeux-jouets': ['building blocks', 'rc car', 'board game', 'jigsaw puzzle', 'plush toy'],
  puericulture: ['baby monitor', 'baby stroller organizer', 'baby carrier', 'bottle sterilizer', 'baby bath toys'],
};

export const DEFAULTS = {
  perCategory: 10,      // produits proposés par catégorie
  shortlist: 25,        // produits soumis au classement de Claude
  minRating: 4.5,       // note idéale (sur 5)
  floorRating: 4.0,     // note minimale acceptée si la catégorie manque de produits (même seuil que le flux du OUI)
  minSales: 100,        // commandes récentes minimales
  minPrice: 8,          // en euros : on évite les prix les plus bas
  maxPrice: 1500,
  refusedCooldownWeeks: 8, // un produit refusé ne revient pas avant ce délai
  alreadyDone: 40,      // au moins ce nombre de candidats cette semaine : la recherche est considérée comme déjà faite
};

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** Lundi (UTC) de la semaine d'une date, AAAA-MM-JJ : même règle que lib/trends.ts. */
export function mondayOf(d) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() || 7) - 1));
  return x.toISOString().slice(0, 10);
}

export const itemUrl = (id) => `https://www.aliexpress.com/item/${id}.html`;

export function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * Note de classement : gain attendu (commission x prix) pondéré par la popularité (racine des commandes, plafonnée) et la note.
 * Une commission inconnue vaut 3 % (taux de base) : le produit n'est pas écarté, seulement un peu moins bien classé.
 */
export function score(item) {
  const rate = item.commissionRate ?? 0.03;
  const sales = Math.min(item.sales ?? 0, 5000);
  const rating = item.rating ?? 4;
  return rate * (item.price ?? 0) * Math.sqrt(sales) * (1 + Math.max(0, rating - 4) / 2);
}

/**
 * Filtre et classe les produits trouvés pour une catégorie.
 * @param {object[]} items  produits normalisés (api.mjs parseProductQuery), plusieurs recherches mélangées
 * @param {{exclude?:Set<string>}} [opts]
 * @returns {{items:object[], relaxed:boolean}}  les meilleurs, déjà triés ; relaxed = la note a dû descendre sous minRating
 */
export function shortlist(items, cfg = DEFAULTS, { exclude = new Set() } = {}) {
  const byId = new Map();
  for (const it of items) if (it.productId && !exclude.has(it.productId) && !byId.has(it.productId)) byId.set(it.productId, it);
  const all = [...byId.values()].filter((it) => it.price >= cfg.minPrice && it.price <= cfg.maxPrice && (it.sales ?? 0) >= cfg.minSales);
  // Fourchette autour de la médiane de la catégorie : ni le très bas de gamme douteux, ni un prix aberrant.
  const med = median(all.map((it) => it.price));
  const inBand = med == null ? all : all.filter((it) => it.price >= med * 0.3 && it.price <= med * 5);
  const strict = inBand.filter((it) => (it.rating ?? 0) >= cfg.minRating);
  let pick = strict;
  let relaxed = false;
  if (strict.length < cfg.perCategory) {
    pick = inBand.filter((it) => (it.rating ?? 0) >= cfg.floorRating);
    relaxed = pick.length > strict.length;
  }
  return { items: pick.sort((a, b) => score(b) - score(a)).slice(0, cfg.shortlist), relaxed };
}

/** Consigne de classement envoyée à Claude. */
export function buildRankPrompt(label, items, n) {
  const lines = items.map((it) => `${it.productId} | ${it.title} | ${it.price} ${it.currency || '€'} | note ${it.rating ?? '?'} | ${it.sales ?? '?'} commandes | commission ${it.commissionRate == null ? '?' : `${(it.commissionRate * 100).toFixed(1)} %`}`);
  return `Tu prépares la sélection hebdomadaire de produits AliExpress pour Tendpick, catégorie « ${label} ». Les acheteurs sont en France, en Espagne et au Royaume-Uni.
Voici ${items.length} produits (identifiant | titre | prix | note | commandes récentes | commission) :
${lines.join('\n')}

Choisis les ${n} meilleurs à proposer cette semaine : produits du moment, utiles ou désirables, bon rapport qualité-prix (ni le moins cher douteux, ni dix fois trop cher), commission intéressante, et de la variété (jamais deux fois le même type de produit).
Écarte : produits pour adultes, armes et couteaux, cigarettes électroniques, produits médicaux ou réglementés, produits dangereux, et les accessoires sans intérêt (coque, câble générique).
Réponds uniquement en JSON, sans autre texte : {"picks":[{"id":"identifiant","product_type":"type de produit en 2 à 4 mots, en français","reason":"une phrase en français : pourquoi ce produit"}]}`;
}

/** Lit la réponse de Claude ; ne garde que des identifiants connus, sans doublon, au plus n. Retourne [] si rien d'exploitable. */
export function parseRanking(text, validIds, n, parseJson) {
  let data;
  try {
    data = parseJson(text);
  } catch {
    return [];
  }
  const seen = new Set();
  const out = [];
  for (const p of Array.isArray(data?.picks) ? data.picks : []) {
    const id = String(p?.id ?? '').trim();
    if (!validIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, productType: String(p.product_type || '').trim().slice(0, 60) || null, reason: String(p.reason || '').trim().slice(0, 300) || null });
    if (out.length >= n) break;
  }
  return out;
}

/**
 * Choisit les n produits d'une catégorie : Claude d'abord, la note calculée en secours.
 * @returns {Promise<{item:object, productType:string|null, reason:string|null}[]>} + propriété `ranked` (vrai si Claude a choisi)
 */
export async function chooseProducts(label, items, n, { llm, parseJson }) {
  const fallback = () => Object.assign(items.slice(0, n).map((item) => ({ item, productType: null, reason: null })), { ranked: false });
  if (!llm || items.length <= 1) return fallback();
  try {
    const raw = await llm(buildRankPrompt(label, items, n));
    const picks = parseRanking(raw, new Set(items.map((i) => i.productId)), n, parseJson);
    if (!picks.length) return fallback();
    const byId = new Map(items.map((i) => [i.productId, i]));
    return Object.assign(picks.map((p) => ({ item: byId.get(p.id), productType: p.productType, reason: p.reason })), { ranked: true });
  } catch {
    return fallback();
  }
}

/**
 * Ligne trend_candidates d'un produit choisi, à partir de sa fiche sur chaque marché (null = absent de ce marché).
 * Un prix n'est gardé que dans la devise du marché : un prix en dollars (l'API ne répond pas pour ce pays) vaut « pas de prix ».
 * @returns {object|null} null si le produit n'est disponible sur aucun marché
 */
export function buildRow({ week, slug, choice, details, now = new Date() }) {
  const ok = {};
  for (const m of MARKETS) {
    const d = details?.[m];
    ok[m] = d && d.promotionLink && d.price != null && d.currency === CURRENCY[m] ? d : null;
  }
  if (!MARKETS.some((m) => ok[m])) return null;
  const { item } = choice;
  const first = ok.fr || ok.es || ok.uk;
  const ratingFromApi = first.ratingPercent != null ? Math.round((first.ratingPercent / 20) * 100) / 100 : null;
  return {
    aliexpress_id: item.productId,
    week,
    category_slug: slug,
    name: item.title.slice(0, 300),
    product_type: choice.productType,
    image_url: item.mainImage || first.mainImage || null,
    price_fr: ok.fr?.price ?? null,
    price_es: ok.es?.price ?? null,
    price_uk: ok.uk?.price ?? null,
    commission_fr: ok.fr?.commissionRate ?? ok.es?.commissionRate ?? null,
    commission_uk: ok.uk?.commissionRate ?? null,
    rating: item.rating ?? ratingFromApi,
    reviews: null, // l'API de recherche ne donne pas le nombre d'avis : le critère « de confiance » s'appuie alors sur les commandes
    sales: num(item.sales ?? first.sales),
    seller: item.shopName || first.shopName || null,
    url_fr: itemUrl(item.productId),
    url_uk: ok.uk ? itemUrl(item.productId) : null,
    note: choice.reason ? `Sélection automatique : ${choice.reason}` : 'Sélection automatique (classement par gain attendu).',
    updated_at: now.toISOString(),
  };
}

/**
 * La recherche complète (sans base de données : tout passe par `deps`, ce qui la rend testable).
 * @param {{search:(kw:string,market:string)=>Promise<object[]>, getProduct:(id:string,market:string)=>Promise<object|null>, llm?:Function, parseJson:Function, log?:Function}} deps
 * @param {{week:string, exclude?:Set<string>, categories?:string[], cfg?:object}} o
 */
export async function searchWeek(deps, { week, exclude = new Set(), categories = Object.keys(CATEGORY_QUERIES), cfg = DEFAULTS }) {
  const log = deps.log || (() => {});
  const rows = [];
  const summary = [];
  const warnings = [];
  let searchErrors = 0;
  let searchCalls = 0;
  for (const slug of categories) {
    const label = CATEGORY_LABELS[slug] || slug;
    const found = [];
    for (const kw of CATEGORY_QUERIES[slug] || []) {
      searchCalls++;
      try {
        found.push(...(await deps.search(kw, 'fr')));
      } catch (e) {
        searchErrors++;
        log(`  ${label} — recherche « ${kw} » impossible : ${e.message}`);
      }
    }
    const { items, relaxed } = shortlist(found, cfg, { exclude });
    if (relaxed) warnings.push(`${label} : pas assez de produits notés ${cfg.minRating} ou plus, la note minimale est descendue à ${cfg.floorRating}.`);
    if (!items.length) {
      warnings.push(`${label} : aucun produit retenu.`);
      summary.push({ slug, label, found: found.length, kept: 0, ranked: false });
      continue;
    }
    const picks = await chooseProducts(label, items, cfg.perCategory, { llm: deps.llm, parseJson: deps.parseJson });
    let kept = 0;
    for (const choice of picks) {
      const details = {};
      for (const m of MARKETS) {
        try {
          details[m] = await deps.getProduct(choice.item.productId, m);
        } catch (e) {
          details[m] = null;
          log(`  ${choice.item.productId} (${m}) : ${e.message}`);
        }
      }
      const row = buildRow({ week, slug, choice, details });
      if (!row) {
        log(`  ${choice.item.productId} écarté : introuvable sur les 3 marchés`);
        continue;
      }
      rows.push(row);
      exclude.add(choice.item.productId);
      kept++;
    }
    log(`${label} : ${found.length} trouvés, ${items.length} retenus pour le classement${picks.ranked ? ' (choix de Claude)' : ' (classement calculé)'}, ${kept} proposés`);
    if (!picks.ranked) warnings.push(`${label} : classé par la note calculée seulement (Claude n'a pas répondu).`);
    summary.push({ slug, label, found: found.length, kept, ranked: picks.ranked === true });
  }
  return { rows, summary, warnings, searchErrors, searchCalls };
}

const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what} : ${error.message}`);
  return data;
};

/** Identifiants à ne pas proposer : produits déjà en fiche, déjà en traitement, ou refusés depuis moins de `cooldownWeeks` semaines. */
export async function loadExclusions(sb, week, cooldownWeeks = DEFAULTS.refusedCooldownWeeks) {
  const exclude = new Set();
  const products = must(await sb.from('products').select('aliexpress_id').not('aliexpress_id', 'is', null), 'lecture des produits');
  for (const p of products || []) exclude.add(String(p.aliexpress_id));
  const since = new Date(`${week}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - cooldownWeeks * 7);
  const cands = must(await sb.from('trend_candidates').select('aliexpress_id, decision, status, week'), 'lecture des tendances');
  for (const c of cands || []) {
    const id = String(c.aliexpress_id);
    if (['validated', 'in_progress', 'ready', 'live'].includes(c.status)) exclude.add(id);
    else if (c.decision === 'no' && new Date(`${c.week}T00:00:00Z`) >= since) exclude.add(id);
  }
  return exclude;
}

/** Enregistre les lignes sans toucher à celles qui existent déjà cette semaine. @returns {{created:number, existing:number, failed:string[]}} */
export async function saveWeek(sb, week, rows) {
  const existing = new Set((must(await sb.from('trend_candidates').select('aliexpress_id').eq('week', week), 'lecture de la semaine') || []).map((r) => String(r.aliexpress_id)));
  const fresh = rows.filter((r) => !existing.has(r.aliexpress_id));
  let created = 0;
  const failed = [];
  for (let i = 0; i < fresh.length; i += 25) {
    const chunk = fresh.slice(i, i + 25);
    const { error } = await sb.from('trend_candidates').insert(chunk);
    if (!error) {
      created += chunk.length;
      continue;
    }
    for (const r of chunk) {
      const one = await sb.from('trend_candidates').insert(r);
      if (one.error) failed.push(`${r.name} (${one.error.message})`);
      else created++;
    }
  }
  return { created, existing: rows.length - fresh.length, failed };
}

/** Supprime les candidats non décidés des semaines précédentes (les refusés sont archivés, jamais supprimés). */
export async function purgeOld(sb, week) {
  const { count, error } = await sb.from('trend_candidates').delete({ count: 'exact' }).eq('decision', 'pending').lt('week', week);
  if (error) throw new Error(`nettoyage des anciens candidats : ${error.message}`);
  return count ?? 0;
}

/**
 * Passage complet : exclusions → recherche → enregistrement → nettoyage.
 * @returns {Promise<{skipped?:string, week:string, created:number, purged:number, summary:object[], warnings:string[], failed:string[], error?:string}>}
 */
export async function runSearch(deps, { sb, now = new Date(), force = false, dryRun = false, categories, cfg = DEFAULTS }) {
  const week = mondayOf(now);
  const log = deps.log || (() => {});
  if (!force) {
    const { count, error } = await sb.from('trend_candidates').select('id', { count: 'exact', head: true }).eq('week', week);
    if (error) throw new Error(`lecture de la semaine : ${error.message}`);
    if ((count ?? 0) >= cfg.alreadyDone) {
      return { skipped: `la semaine du ${week} contient déjà ${count} candidats (ajoute --force pour refaire la recherche)`, week, created: 0, purged: 0, summary: [], warnings: [], failed: [] };
    }
  }
  const exclude = await loadExclusions(sb, week, cfg.refusedCooldownWeeks);
  log(`Semaine du ${week} — ${exclude.size} produits déjà connus (en ligne, en cours ou refusés récemment) ne seront pas reproposés.`);
  const res = await searchWeek(deps, { week, exclude, categories, cfg });
  // Une recherche qui a surtout échoué ne doit ni vider ni remplacer la semaine : on s'arrête là.
  if (!res.rows.length || res.searchErrors > res.searchCalls / 2) {
    return { week, created: 0, purged: 0, summary: res.summary, warnings: res.warnings, failed: [], error: `la recherche a échoué (${res.searchErrors} appels en erreur sur ${res.searchCalls}, ${res.rows.length} produit(s) trouvé(s)) : rien n'a été modifié` };
  }
  if (dryRun) return { week, created: 0, purged: 0, summary: res.summary, warnings: res.warnings, failed: [], preview: res.rows };
  const saved = await saveWeek(sb, week, res.rows);
  const purged = saved.created > 0 ? await purgeOld(sb, week) : 0;
  return { week, created: saved.created, purged, summary: res.summary, warnings: res.warnings, failed: saved.failed };
}

export function reportText(r) {
  if (r.skipped) return `Rien à faire : ${r.skipped}`;
  const lines = [`Semaine du ${r.week} : ${r.created} produit(s) proposé(s), ${r.purged} ancien(s) candidat(s) non décidé(s) supprimé(s).`];
  for (const s of r.summary) lines.push(`  - ${s.label} : ${s.kept} proposé(s) sur ${s.found} trouvés${s.ranked ? '' : ' (classement calculé)'}`);
  for (const w of r.warnings) lines.push(`  ! ${w}`);
  for (const f of r.failed) lines.push(`  ✗ non enregistré : ${f}`);
  if (r.error) lines.push(`ÉCHEC : ${r.error}`);
  return lines.join('\n');
}

// ─── Lancement en ligne de commande ────────────────────────────────────────

const MAX_RUN_MIN = 25;

async function main() {
  const args = process.argv.slice(2);
  const val = (n) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const dryRun = args.includes('--dry-run');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absentes (lancer avec --env-file=.env.local)');
  setTimeout(() => {
    console.error(`Arrêt : la recherche dépasse ${MAX_RUN_MIN} minutes. Rien n'est supprimé tant que l'enregistrement n'a pas eu lieu.`);
    process.exit(2);
  }, MAX_RUN_MIN * 60000).unref();
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { searchProducts, getProductForMarket } = await import('../aliexpress/api.mjs');
  const { callText, parseJsonLoose, textProvider } = await import('./fiche-text.mjs');
  const { renderEmail, sendMail } = await import('./notify.mjs');

  let llm;
  if (textProvider() === 'none') console.log('Aucune clé IA (ANTHROPIC_API_KEY) : classement calculé uniquement.');
  else llm = (p) => callText(p);
  const cats = val('category') ? [val('category')] : undefined;
  if (cats && !CATEGORY_QUERIES[cats[0]]) throw new Error(`catégorie inconnue : ${cats[0]} (attendu : ${Object.keys(CATEGORY_QUERIES).join(', ')})`);
  const cfg = { ...DEFAULTS, ...(val('per') ? { perCategory: Math.max(1, Math.floor(Number(val('per')))) } : {}) };
  const deps = {
    search: (kw, market) => searchProducts(kw, market),
    getProduct: (id, market) => getProductForMarket(id, market),
    llm, parseJson: parseJsonLoose,
    log: (m) => console.log(redact(m)),
  };
  let res;
  try {
    res = await runSearch(deps, { sb, force: args.includes('--force'), dryRun, categories: cats, cfg });
  } catch (e) {
    res = { week: mondayOf(new Date()), created: 0, purged: 0, summary: [], warnings: [], failed: [], error: redact(e.message || e) };
  }
  console.log(`\n${redact(reportText(res))}`);
  if (dryRun && res.preview) {
    console.log('\nAperçu (non enregistré) :');
    for (const r of res.preview) console.log(`  [${r.category_slug}] ${r.aliexpress_id} — ${r.name.slice(0, 70)} | FR ${r.price_fr ?? '—'} ES ${r.price_es ?? '—'} UK ${r.price_uk ?? '—'} | note ${r.rating ?? '—'} | ${r.sales ?? '—'} cmd`);
  }
  if (!dryRun && !res.skipped) {
    const mail = await sendMail(renderEmail({ kind: 'trends', result: res }));
    if (!mail.ok) console.log(`(e-mail non envoyé : ${redact(mail.error)})`);
  }
  if (res.error) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(redact(e.message || e));
    process.exit(1);
  });
}
