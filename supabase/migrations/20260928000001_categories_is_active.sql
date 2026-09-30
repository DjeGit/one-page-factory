-- Masquer/desactiver une categorie sans la supprimer (28/09, demande
-- Jerome) : les produits qui l'utilisent gardent leur category_id, la
-- categorie disparait juste de la nav publique et des pages qui listent
-- les categories actives.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
