-- Nom du revendeur affiché dans « Vendu par » (30/10, demande Jerome) :
-- « AliExpress · <boutique> ». Nullable : sans valeur, seul le nom de la marketplace s'affiche.
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_name text;
