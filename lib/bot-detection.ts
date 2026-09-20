// Sprint 5 (complément demandé par Jerome) : filtrage des bots/crawlers
// connus avant d'écrire une vue ou un clic dans les tables d'analytics
// (page_views / clicks). Objectif : que les chiffres du dashboard par
// marché reflètent du trafic humain, pas des crawlers SEO, des bots de
// preview de lien sur les réseaux sociaux, ou des scrapers.
//
// Approche volontairement simple (liste de motifs sur le User-Agent) plutôt
// qu'une lib tierce (isbot, ua-parser-js) : pas de nouvelle dépendance pour
// un besoin qui reste "filtrer le bruit évident", pas "détection bot
// exhaustive anti-fraude". À revisiter avec une vraie lib si le besoin
// grandit (ex. détection de fraude au clic sur des campagnes payantes).
const BOT_USER_AGENT_PATTERNS: RegExp[] = [
  // Moteurs de recherche
  /googlebot/i,
  /bingbot/i,
  /yandex(bot)?/i,
  /baiduspider/i,
  /duckduckbot/i,
  /applebot/i,
  /slurp/i, // Yahoo

  // Bots de preview de lien / réseaux sociaux (Postiz publie sur ces
  // réseaux — leurs bots viennent déclencher l'unfurl du lien juste après)
  /facebookexternalhit/i,
  /facebot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  /slackbot/i,
  /pinterest/i,
  /redditbot/i,
  /skypeuripreview/i,
  /vkshare/i,
  /embedly/i,

  // Bots IA (indexation / entraînement)
  /gptbot/i,
  /chatgpt-user/i,
  /claudebot/i,
  /anthropic-ai/i,
  /perplexitybot/i,
  /bytespider/i,
  /ccbot/i,

  // Bots SEO / scraping / monitoring
  /ahrefsbot/i,
  /semrushbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /screaming frog/i,
  /uptimerobot/i,
  /pingdom/i,
  /site24x7/i,
  /statuscake/i,

  // Clients scriptés génériques (jamais un vrai navigateur)
  /headlesschrome/i,
  /phantomjs/i,
  /python-requests/i,
  /python-urllib/i,
  /go-http-client/i,
  /node-fetch/i,
  /^axios\//i,
  /curl\//i,
  /wget\//i,
  /postmanruntime/i,
  /^okhttp/i,
  /^bot\b/i,
  /\bcrawler\b/i,
  /\bspider\b/i,
];

/**
 * true si le User-Agent correspond à un bot/crawler connu, ou est absent
 * (un vrai navigateur envoie toujours un User-Agent — son absence trahit
 * quasi systématiquement un script plutôt qu'un visiteur).
 */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim() === '') return true;
  return BOT_USER_AGENT_PATTERNS.some((pattern) => pattern.test(userAgent));
}
