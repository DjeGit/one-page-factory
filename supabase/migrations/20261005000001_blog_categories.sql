-- Categories du blog (05/10, demande Jerome : "je veux pouvoir dissocier
-- les differents articles ... on devra pouvoir les trier et pourquoi pas
-- envisager un design different selon les categories").
--
-- Table DEDIEE au blog, separee de `categories` (categories produit) —
-- choix valide avec Jerome : logique editoriale differente de la logique
-- merchandising produit, et c'est ce qui permettra plus tard un design
-- different par categorie (le slug/color ci-dessous servent de point
-- d'accroche pour ca, sans construire de systeme de template maintenant).
--
-- `tags` (text[] sur blog_posts, migration precedente) n'est PAS remplace
-- par les categories — valide avec Jerome : la categorie est LE rayon
-- principal de l'article (un seul, sert au tri/filtre/design), les tags
-- restent des etiquettes libres en complement (plusieurs par article).
--
-- Meme schema que `categories` (name_fr/es/uk des maintenant, meme si le
-- blog ne tourne qu'en FR pour l'instant — evite une migration de plus
-- quand ES/UK ouvriront, comme deja fait pour categories/blog_posts).
-- `color` optionnel (hex) : juste un accent visuel (badge) utilisable deja
-- aujourd'hui, pas un systeme de theme — base simple si un design par
-- categorie plus elabore est voulu plus tard.

CREATE TABLE IF NOT EXISTS blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  name_es text NOT NULL,
  name_uk text NOT NULL,
  icon text,
  color text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
-- Aucune policy anon/authenticated : service_role uniquement, meme logique
-- que le reste du schema.

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES blog_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON blog_posts(category_id);

-- Jeu de depart — a ajuster/completer dans l'admin (/admin/blog/categories).
INSERT INTO blog_categories (slug, name_fr, name_es, name_uk, icon, color, sort_order) VALUES
  ('produits-tendance', 'Produits tendance', 'Productos de tendencia', 'Trending products', '🔥', '#FF6B35', 0),
  ('high-tech', 'High-tech', 'Tecnología', 'Tech', '💻', '#4A90D9', 1),
  ('guides-achat', 'Guides d''achat', 'Guías de compra', 'Buying guides', '🧭', '#1B2A4A', 2),
  ('actus-tests', 'Actus & tests', 'Noticias y pruebas', 'News & reviews', '📰', '#7C3AED', 3)
ON CONFLICT (slug) DO NOTHING;
