-- Blog editorial (04/10, demande Jerome) — Sprint 1 du chantier "Blog +
-- Vente directe". Articles sur les produits tendance, le high-tech, etc.,
-- avec deux modes de redaction : manuel depuis l'admin, ou brouillon
-- genere par IA (toujours relu avant publication, voir Sprint 3 /
-- lib/ai.ts) — jamais auto-publie, le champ generated_by_ai ne fait que
-- tracer l'origine.
--
-- Pas de table blog_categories separee : un simple tags text[] suffit
-- pour filtrer par sujet ("produits tendance", "high-tech", ...), meme
-- philosophie "simple d'abord, migrable plus tard" que les categories
-- produit (voir 20260923000001_categories.sql). linked_product_ids est
-- une reference "molle" (Postgres ne contraint pas un uuid[] element par
-- element) validee cote API a l'ecriture, pas par une contrainte DB.
--
-- Lancement en francais uniquement (tendpick.fr) mais la colonne market
-- existe des maintenant (CHECK fr/es/uk, comme products/categories) pour
-- ne pas avoir a remigrer quand les autres marches ouvriront.

CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  market text NOT NULL DEFAULT 'fr' CHECK (market IN ('fr', 'es', 'uk')),
  title text NOT NULL,
  excerpt text,
  -- Markdown brut (voir Sprint 2 : editeur @uiw/react-md-editor, rendu
  -- public via react-markdown — jamais de dangerouslySetInnerHTML).
  content text NOT NULL DEFAULT '',
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  tags text[] NOT NULL DEFAULT '{}',
  linked_product_ids uuid[] NOT NULL DEFAULT '{}',
  author_name text,
  meta_title text,
  meta_description text,
  generated_by_ai boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_market_status ON blog_posts(market, status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN(tags);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
-- Aucune policy anon/authenticated : service_role uniquement, meme logique
-- que le reste du schema (voir 20260918000001_enable_rls.sql).

CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER trg_blog_posts_updated_at BEFORE UPDATE ON blog_posts
FOR EACH ROW EXECUTE PROCEDURE update_blog_posts_updated_at();
