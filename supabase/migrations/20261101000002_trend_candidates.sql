-- Tendance de la semaine (admin > Intelligence) : produits candidats proposés chaque semaine.
-- Règles : les candidats NON choisis disparaissent à la recherche suivante ; les produits REFUSÉS
-- (decision = 'no') ne sont jamais supprimés : ils sont archivés, masqués par défaut, et peuvent
-- réapparaître dans une nouvelle recherche (badge « déjà refusé le … »).
CREATE TABLE IF NOT EXISTS trend_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aliexpress_id text NOT NULL,
  week date NOT NULL,                       -- lundi de la semaine de recherche
  category_slug text NOT NULL,              -- slug de categories (tech, mode-beaute, …)
  name text NOT NULL,
  product_type text,
  image_url text,
  price_fr numeric, price_es numeric, price_uk numeric,
  commission_fr numeric,                    -- fraction (0.07 = 7 %), FR et ES
  commission_uk numeric,
  rating numeric, reviews integer, sales integer,
  seller text,
  free_shipping_fr text, free_shipping_es text, free_shipping_uk text,
  url_fr text, url_uk text,
  note text,
  decision text NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending', 'yes', 'no')),
  decided_at timestamptz,
  status text NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate', 'validated', 'in_progress', 'ready', 'live', 'error')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aliexpress_id, week)
);
CREATE INDEX IF NOT EXISTS trend_candidates_week_idx ON trend_candidates (week, category_slug);
CREATE INDEX IF NOT EXISTS trend_candidates_decision_idx ON trend_candidates (decision);
ALTER TABLE trend_candidates ENABLE ROW LEVEL SECURITY;
