-- Suppression de la catégorie « Best of Amazon » (13/11/2026, demande Jerome) :
-- les produits vont directement dans la catégorie voulue, une catégorie « fourre-tout » est inutile.
--
-- Les produits qui y étaient rangés ne sont PAS supprimés : products.category_id est en ON DELETE SET NULL,
-- ils se retrouvent « Sans catégorie » (visibles dans Admin > Produits > Sans catégorie) et sont à ranger.
-- À exécuter APRÈS avoir déployé le code (le pipeline Amazon ne cherche plus cette catégorie).
-- Relancer ce script est sans danger.

-- 1) Pour information : combien de produits sont concernés ?
SELECT count(*) AS produits_a_ranger
FROM products
WHERE category_id = (SELECT id FROM categories WHERE slug = 'best-of-amazon');

-- 2) Suppression
DELETE FROM categories WHERE slug = 'best-of-amazon';

-- Contrôle : SELECT slug, name_fr FROM categories ORDER BY sort_order;
