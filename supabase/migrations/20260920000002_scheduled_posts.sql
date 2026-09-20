-- Publication sociale programmée (rapport "OPF — Compléments à prévoir",
-- 18/09, étape 4) — Postiz/Ayrshare/TikTok/Meta publient déjà en temps réel
-- via /api/social/publish (registre Sprint 3) ; il ne manquait que la
-- programmation dans le temps. Scheduler interne (cette table + un cron
-- /api/cron/social-publish) plutôt qu'un paramètre de programmation natif
-- de l'API Postiz : reste agnostique du canal, fonctionnera pareil pour
-- Ayrshare/TikTok/Meta.

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_ids text[] NOT NULL,
  text text NOT NULL,
  image_urls text[],
  video_url text,
  link text,
  market text NOT NULL CHECK (market IN ('fr', 'es', 'uk')),
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_due ON scheduled_posts(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_market ON scheduled_posts(market);

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
-- Aucune policy anon/authenticated : service_role uniquement, même logique
-- que invoice_number_sequences (Sprint 2) et integrations (Sprint 3).
