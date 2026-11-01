-- Photos automatiques des produits retenus (Tendance de la semaine).
-- image_urls : photos source du vendeur (récupérées par scripts/photos/run.mjs ou fournies à la main).
-- photos     : photos finales (JPEG carré 1000x1000 déjà envoyées sur Cloudinary), dans l'ordre : la 1re = couverture.
--              [{ "public_id": "products/ae-123-1", "url": "https://res.cloudinary.com/...", "kind": "product_white", "text": "none", "watermark": false, "flags": [] }]
-- photos_status : none (rien fait) → review (à vérifier par Jerome) → approved → attached (copiées dans products.images) ; error si échec.
ALTER TABLE trend_candidates
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS photos_status text NOT NULL DEFAULT 'none'
    CHECK (photos_status IN ('none', 'review', 'approved', 'attached', 'error')),
  ADD COLUMN IF NOT EXISTS photos_report jsonb;
