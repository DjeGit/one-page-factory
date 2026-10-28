-- Catégories (28/10/2026, demande Jerome) :
--  1. « Gaming, Casino & Paris » devient « Jeux & Jouets » (slug jeux-jouets).
--     Les produits déjà rangés dedans suivent : le lien se fait par category_id,
--     le renommage ne les touche pas. Les anciennes URL /c/gaming-casino-*
--     répondent en 301 (voir lib/category-slugs.ts, LEGACY_SLUGS).
--  2. Nouvelle catégorie « Bébé & Puériculture » (slug puericulture) :
--     poussettes, landaus, parcs, lits, sièges auto…
-- À exécuter AVANT de déployer le code : le code cherche le slug jeux-jouets.
-- Relancer ce script est sans danger.
BEGIN;

UPDATE categories
SET slug = 'jeux-jouets',
    name_fr = 'Jeux & Jouets',
    name_es = 'Juguetes y Juegos',
    name_uk = 'Toys & Games',
    icon = '🧸'
WHERE slug = 'gaming'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'jeux-jouets');

INSERT INTO categories (slug, name_fr, name_es, name_uk, icon, sort_order) VALUES
  ('jeux-jouets', 'Jeux & Jouets', 'Juguetes y Juegos', 'Toys & Games', '🧸', 5),
  ('puericulture', 'Bébé & Puériculture', 'Bebé y Puericultura', 'Baby & Nursery', '🍼', 8)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- Contrôle : SELECT slug, name_fr, name_es, name_uk, is_active, active_markets FROM categories ORDER BY sort_order;
