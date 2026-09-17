-- Sprint 3 — Registre d'intégrations pluggables (sources de données étude
-- de marché + canaux de diffusion réseaux sociaux).
--
-- IMPORTANT sécurité (cohérent avec Sprint 0) : cette table NE CONTIENT
-- JAMAIS de clé API en clair. Elle ne stocke que l'état d'activation et des
-- métadonnées non sensibles. Les vraies clés API vivent en variables
-- d'environnement serveur (.env.local en dev, injectées par PM2 en prod).
-- Le toggle `enabled` ne fait qu'AUTORISER l'exécution : le code vérifie
-- toujours en plus que la variable d'env correspondante est présente
-- (cf. lib/integrations/registry.ts), même pattern que la détection de
-- provider actif dans lib/ai.ts.

CREATE TABLE IF NOT EXISTS integrations (
  id text PRIMARY KEY,                 -- slug stable, ex. 'keepa', 'postiz'
  category text NOT NULL CHECK (category IN ('data_source', 'social_channel', 'orchestration')),
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}',  -- paramètres NON sensibles (région, feed id, etc.)
  last_synced_at timestamptz,
  last_status text CHECK (last_status IN ('ok', 'error', 'never_run')) DEFAULT 'never_run',
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
-- Pas de policy anon : accès service_role uniquement (admin), même logique
-- que la migration RLS du Sprint 0.

CREATE OR REPLACE FUNCTION update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_integrations_updated_at ON integrations;
CREATE TRIGGER trg_integrations_updated_at BEFORE UPDATE ON integrations
FOR EACH ROW EXECUTE PROCEDURE update_integrations_updated_at();

-- Seed : toutes les intégrations connues, TOUTES désactivées par défaut
-- (exigence explicite : rien ne s'active tout seul, Jerome choisit).
INSERT INTO integrations (id, category) VALUES
  ('keepa',            'data_source'),
  ('dataforseo',       'data_source'),
  ('amazon-creators',  'data_source'),
  ('awin',             'data_source'),
  ('rakuten',          'data_source'),
  ('cj-affiliate',     'data_source'),
  ('aliexpress',       'data_source'),
  ('google-trends',    'data_source'),
  ('serpapi',          'data_source'),
  ('jungle-scout',     'data_source'),
  ('canopy',           'data_source'),
  ('amazon-scraping-fallback', 'data_source'),
  ('postiz',           'social_channel'),
  ('ayrshare',         'social_channel'),
  ('tiktok',           'social_channel'),
  ('meta-ads',         'social_channel'),
  ('n8n',              'orchestration')
ON CONFLICT (id) DO NOTHING;
