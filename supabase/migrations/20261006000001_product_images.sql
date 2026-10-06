-- Images multiples par produit (06/10, demande Jerome : "on devrait avoir la
-- possibilité de mettre 3 photos ou plus" sur la page produit).
--
-- `images` = liste ordonnée de Cloudinary public IDs ou d'URLs ; la première
-- est la couverture. `image_url` est CONSERVÉ et reste synchronisé avec
-- images[1] côté application : toutes les cartes (accueil, catalogue, blog,
-- Open Graph...) lisent encore image_url, aucune ne doit être réécrite.
ALTER TABLE products ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';

-- Rattrapage : les produits existants démarrent avec leur image actuelle
-- comme première (et seule) photo de la galerie.
UPDATE products
SET images = ARRAY[image_url]
WHERE image_url IS NOT NULL
  AND image_url <> ''
  AND cardinality(images) = 0;
