-- Mesure d'audience maison (24/10/2026) : visiteurs qui reviennent, fréquence,
-- pages consultées, temps passé. Alimentée UNIQUEMENT après consentement
-- (cookie `tp_vid`, voir lib/visitor-tracking.ts et app/api/visit/route.ts).
--
-- Minimisation : aucune adresse IP, aucun user-agent stocké. Un visiteur =
-- un identifiant aléatoire propre à un domaine (tendpick.fr / .es / .com ne
-- partagent rien). Conservation : 13 mois après la dernière visite
-- (purge_visitor_data(), appelée chaque nuit par le cron « purge-visits »).
-- Retrait du consentement : l'API supprime la ligne du visiteur, et ses
-- visites partent avec (ON DELETE CASCADE).

CREATE TABLE IF NOT EXISTS visitors (
  visitor_id  uuid PRIMARY KEY,
  market      text NOT NULL CHECK (market IN ('fr', 'es', 'uk')),
  first_seen  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now(),
  visit_count integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS page_visits (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id       uuid NOT NULL REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  session_id       text NOT NULL,
  market           text NOT NULL CHECK (market IN ('fr', 'es', 'uk')),
  path             text NOT NULL,
  page_type        text NOT NULL,
  referrer_host    text,
  entered_at       timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer CHECK (duration_seconds IS NULL OR (duration_seconds >= 0 AND duration_seconds <= 1800))
);

CREATE INDEX IF NOT EXISTS idx_page_visits_market_entered ON page_visits (market, entered_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_visitor ON page_visits (visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitors_market_last_seen ON visitors (market, last_seen DESC);

-- Même politique que le reste de la base : aucun accès pour le rôle anon,
-- seul service_role (l'application) lit et écrit.
ALTER TABLE visitors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION purge_visitor_data(retention interval DEFAULT interval '13 months')
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  removed integer;
BEGIN
  DELETE FROM visitors WHERE last_seen < now() - retention;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;
