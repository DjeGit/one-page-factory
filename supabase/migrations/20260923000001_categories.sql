-- Categories (23/09) — Jerome veut diversifier Tendpick au-dela des
-- produits Amazon auto-decouverts : pouvoir ajouter manuellement des
-- offres de n'importe quel programme d'affiliation (deja possible, le
-- formulaire produit accepte une affiliate_url libre) ET les ranger dans
-- des categories visibles cote public (Best of Amazon, Tech, Gaming...).
--
-- Une categorie par produit pour demarrer (pas de many-to-many) — Jerome
-- a valide cette option, plus simple, migrable vers plusieurs categories
-- par produit plus tard si le besoin se confirme.
--
-- Noms traduits par marche (name_fr/name_es/name_uk) des maintenant,
-- meme si l'affichage public n'est pas encore localise (chantier separe,
-- app/page.tsx et app/produits/page.tsx sont encore 100% en dur en
-- francais) — evite une deuxieme migration quand cette localisation sera
-- faite.

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  name_es text NOT NULL,
  name_uk text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- Aucune policy anon/authenticated : service_role uniquement, meme logique
-- que les autres tables.

ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Jeu de categories de depart — propose par Claude sur demande de Jerome
-- ("regarde ce que tu trouves pertinent"), a ajuster/completer dans
-- l'admin au fur et a mesure. "Best of Amazon" recoit par defaut tous les
-- produits importes automatiquement par le pipeline Amazon (voir
-- app/api/pipeline/discover/route.ts) ; les autres categories sont
-- prevues pour la curation manuelle multi-sources (Gaming = poker/casino/
-- betting, cf. discussion Jerome du 23/09).
INSERT INTO categories (slug, name_fr, name_es, name_uk, icon, sort_order) VALUES
  ('best-of-amazon', 'Best of Amazon', 'Lo mejor de Amazon', 'Best of Amazon', '📦', 0),
  ('tech', 'Tech & Gadgets', 'Tecnología', 'Tech & Gadgets', '💻', 1),
  ('mode-beaute', 'Mode & Beauté', 'Moda y Belleza', 'Fashion & Beauty', '💄', 2),
  ('maison-deco', 'Maison & Déco', 'Hogar y Decoración', 'Home & Living', '🏠', 3),
  ('sport-bien-etre', 'Sport & Bien-être', 'Deporte y Bienestar', 'Sport & Wellness', '🏋️', 4),
  ('gaming', 'Gaming, Casino & Paris', 'Gaming, Casino y Apuestas', 'Gaming, Casino & Betting', '🎮', 5),
  ('art-design', 'Art & Design', 'Arte y Diseño', 'Art & Design', '🎨', 6),
  ('loisirs', 'Loisirs & Divertissement', 'Ocio y Entretenimiento', 'Hobbies & Leisure', '🎯', 7)
ON CONFLICT (slug) DO NOTHING;

-- Retro-categorisation : tous les produits deja actifs (13 FR + imports
-- ES/UK du 23/09), sans categorie, sont ranges dans "Best of Amazon" —
-- ils viennent tous du pipeline auto Amazon a ce jour.
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'best-of-amazon')
WHERE category_id IS NULL;
