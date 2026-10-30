-- Vidéo de présentation (30/10, demande Jerome) : lien YouTube du fabricant ou d'un test.
-- Affichée sur la fiche sous forme de miniature ; le lecteur (youtube-nocookie.com) ne se charge qu'au clic.
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url text;
