require('dotenv').config({ path: '/var/www/one-page-factory/.env.local' });

// Liste blanche des variables d'env transmises au process Next.js par PM2.
// Toute variable présente dans .env.local mais absente d'ici est silencieusement
// ignorée au démarrage — penser à l'ajouter ici en plus de .env.local /
// .env.example à chaque nouvelle intégration.
const ENV_ALLOWLIST = [
  // ─── Core (Supabase + IA) ──────────────────────────────────────────────
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY',

  // ─── Admin & sécurité (Sprint 0) ───────────────────────────────────────
  'ADMIN_SECRET', 'ADMIN_SALT', 'ADMIN_EMAIL',
  'PIPELINE_SECRET', 'INTERNAL_CRON_SECRET',

  // ─── Site & media ───────────────────────────────────────────────────────
  'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',

  // ─── Sprint 3 : registre d'intégrations — sources de données marché ────
  'KEEPA_API_KEY', 'DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD',
  'AMAZON_CREATORS_CREDENTIAL_ID', 'AMAZON_CREATORS_CREDENTIAL_SECRET', 'AMAZON_AFFILIATE_TAG',
  'AWIN_API_TOKEN',
  'RAKUTEN_API_TOKEN', 'RAKUTEN_MERCHANT_ID_FR', 'RAKUTEN_MERCHANT_ID_ES', 'RAKUTEN_MERCHANT_ID_UK',
  'CJ_API_TOKEN', 'CJ_WEBSITE_ID',
  'ALIEXPRESS_APP_KEY', 'ALIEXPRESS_APP_SECRET', 'ALIEXPRESS_TRACKING_ID',
  'SERPAPI_API_KEY', 'JUNGLESCOUT_KEY_NAME', 'JUNGLESCOUT_API_KEY', 'CANOPY_API_KEY',

  // ─── Sprint 3 : registre d'intégrations — canaux de diffusion ──────────
  'POSTIZ_INSTANCE_URL', 'POSTIZ_API_KEY', 'AYRSHARE_API_KEY',
  'TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REFRESH_TOKEN',
  'META_PAGE_ACCESS_TOKEN', 'META_PAGE_ID',

  // ─── Pipeline Keepa/PostgreSQL autonome (lib/db.ts, lib/keepa.ts,
  //     app/api/sync/*, app/api/scores/*, app/api/track/*) — indépendant
  //     du registre d'intégrations ci-dessus, sa propre clé d'auth
  //     interne (INTERNAL_API_KEY ≠ INTERNAL_CRON_SECRET) et son propre
  //     SERPAPI_KEY (≠ SERPAPI_API_KEY du registre — même service,
  //     variable distincte, historique) ────────────────────────────────
  'DATABASE_URL', 'INTERNAL_API_KEY', 'SERPAPI_KEY',
  'ONESIGNAL_API_KEY', 'ONESIGNAL_APP_ID',
];

module.exports = {
  apps: [{
    name: 'opf',
    script: 'node_modules/.bin/next',
    args: 'start -p 3000',
    cwd: '/var/www/one-page-factory',
    env: {
      NODE_ENV: 'production',
      ...Object.fromEntries(
        Object.entries(process.env).filter(([k]) => ENV_ALLOWLIST.includes(k))
      )
    }
  }]
};
