// Descriptions courtes affichées dans /admin/settings/integrations — pour
// que Jerome sache en un coup d'oeil ce que chaque intégration apporte et
// son coût approximatif, sans avoir à rouvrir les rapports stratégiques.
export const INTEGRATION_DESCRIPTIONS: Record<string, string> = {
  keepa: 'Historique prix + BSR par marketplace (.fr/.es/.co.uk). ~19€/mois. Essentiel.',
  dataforseo: 'Google Shopping + tendances par pays. ~25€/mois selon volume. Essentiel.',
  'amazon-creators': "API officielle Amazon (remplace PA-API). Gratuite dès 10 ventes affiliées qualifiées/30j.",
  awin: 'Réseau affilié n°1 Europe (Fnac, Decathlon, El Corte Inglés...). Gratuit.',
  rakuten: 'Réseau affilié fort FR/ES. Gratuit.',
  'cj-affiliate': 'Réseau affilié fort US/UK, présence FR/ES. Gratuit.',
  aliexpress: 'Produits AliExpress avant qu\'ils arrivent sur Amazon. Gratuit.',
  'google-trends': 'Validation de tendance par pays. Gratuit (best-effort, non officiel).',
  serpapi: 'Scraping Google Shopping par pays, alternative payante. Optionnel.',
  'jungle-scout': 'Recherche Amazon avancée + prévision de tendances. Optionnel, Phase 2.',
  canopy: 'Données Amazon sans compte vendeur, fort sur .com. Optionnel.',
  'amazon-scraping-fallback': 'Scraping direct Amazon (fragile, casse facilement) — secours uniquement.',
  postiz: 'Publication réseaux sociaux, auto-hébergé sur ton serveur. Gratuit.',
  ayrshare: 'Publication réseaux sociaux, SaaS. ~29$/mois.',
  tiktok: 'Publication officielle TikTok. Gratuit — audit de compte 2-6 semaines requis.',
  'meta-ads': 'Publication Facebook/Instagram (Page). Gratuit — vérification business requise.',
};
