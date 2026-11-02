-- Flux automatique « OUI » de la page Tendance de la semaine (scripts/pipeline/worker.mjs).
-- Le serveur traite chaque produit validé (decision = 'yes', status = 'validated') :
--   liens affiliés vérifiés → textes → fiches brouillon → photos → status 'ready' → mise en ligne à publish_at.
-- product_ids  : fiches créées (une par marché disponible)
-- ready_at     : fin de préparation ; publish_at : heure de mise en ligne automatique (24 h pour la 1re fiche)
-- hold_reason  : motif d'un blocage volontaire de la mise en ligne automatique (ex. produit enfant : vérifier le marquage CE)
-- pipeline_log : dernier rapport du flux (marchés, contrôles, avertissements) pour le diagnostic
ALTER TABLE trend_candidates
  ADD COLUMN IF NOT EXISTS product_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS hold_reason text,
  ADD COLUMN IF NOT EXISTS pipeline_log jsonb;
