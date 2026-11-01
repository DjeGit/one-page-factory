-- Prix relevé chez le marchand (affiché avec astérisque + mention) et livraison gratuite.
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_currency text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_checked_at date;
ALTER TABLE products ADD COLUMN IF NOT EXISTS free_shipping boolean NOT NULL DEFAULT false;
