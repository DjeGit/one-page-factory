-- Module nurture email (rapport "OPF — Compléments à prévoir", 18/09, étape
-- 3) — suivi d'inscription des leads existants dans une séquence de relance
-- Brevo. N'ajoute qu'un suivi d'état côté OPF : l'inscription elle-même se
-- fait via l'API Brevo (liste dédiée à la relance, séparée de
-- BREVO_LIST_ID_FR/ES/UK déjà utilisée par la capture de leads — voir
-- lib/nurture/sequences.ts pour l'explication de cette séparation).

ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS nurture_status text NOT NULL DEFAULT 'none'
  CHECK (nurture_status IN ('none', 'enrolled', 'unsubscribed'));
ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS nurture_sequence text;
ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS nurture_enrolled_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_email_leads_nurture_status ON email_leads(nurture_status);
