-- Reprise automatique du tri des photos d'un produit déjà prêt ou en ligne (scripts/photos/set-images.mjs → worker).
-- photos_status « redo » = de nouvelles images source ont été ajoutées : le worker refait le tri au prochain passage.
ALTER TABLE trend_candidates DROP CONSTRAINT IF EXISTS trend_candidates_photos_status_check;
ALTER TABLE trend_candidates
  ADD CONSTRAINT trend_candidates_photos_status_check
  CHECK (photos_status IN ('none', 'review', 'approved', 'attached', 'error', 'redo'));
