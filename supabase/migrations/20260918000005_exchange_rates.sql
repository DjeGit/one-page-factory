-- Sprint 5 — taux de change pour le calcul coût/gain multi-devise.
-- FR/ES = EUR, UK = GBP (cf. lib/market.ts → getCurrencyForMarket).
-- Alimentée quotidiennement par app/api/cron/exchange-rates (source
-- gratuite frankfurter.app, pas de clé requise), jamais en dur dans le
-- code — un taux de change fige à la seconde où on le lit.

CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL DEFAULT 'EUR',
  target_currency text NOT NULL,
  rate numeric(12,6) NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup
  ON exchange_rates(base_currency, target_currency, fetched_at DESC);

-- RLS activée dès la création, cohérent avec la posture "deny-by-default"
-- du Sprint 0 — aucune policy anon, seul service_role (utilisé
-- exclusivement côté serveur par ce projet) peut lire/écrire.
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
