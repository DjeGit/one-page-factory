-- Visibilité des catégories PAR MARCHÉ (18/10, demande Jerome).
-- Avant : categories.is_active était global — activer une catégorie depuis
-- l'admin ES la faisait apparaître aussi sur tendpick.com et tendpick.fr.
-- Après : active_markets liste les marchés où la catégorie est visible.
-- is_active reste synchronisé (vrai si au moins un marché est actif) pour le
-- code historique. Relancer ce script est sans danger.
BEGIN;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS active_markets text[] NOT NULL DEFAULT ARRAY['fr','es','uk']::text[];

-- Reprise de l'existant : une catégorie active l'était sur les 3 marchés,
-- une catégorie masquée l'était sur aucun. L'état public ne change donc pas
-- au moment de la migration ; il suffit ensuite de décocher les marchés
-- voulus dans Admin > Catégories (sélecteur de marché en haut).
UPDATE categories
SET active_markets = CASE WHEN is_active THEN ARRAY['fr','es','uk']::text[] ELSE ARRAY[]::text[] END
WHERE active_markets = ARRAY['fr','es','uk']::text[] OR active_markets = ARRAY[]::text[];

COMMIT;

-- Contrôle : SELECT slug, is_active, active_markets FROM categories ORDER BY sort_order;
