-- Identifiant produit AliExpress sur chaque fiche (une ligne par marché) : relie la fiche à l'API affiliée
-- (génération du lien affilié, prix du jour) même quand affiliate_url devient un lien court s.click.aliexpress.com.
ALTER TABLE products ADD COLUMN IF NOT EXISTS aliexpress_id text;
CREATE INDEX IF NOT EXISTS products_aliexpress_id_idx ON products (aliexpress_id);

-- Rattrapage : les fiches dont le lien est encore l'adresse neutre .../item/<id>.html
UPDATE products
SET aliexpress_id = substring(affiliate_url from '/item/([0-9]{8,})')
WHERE aliexpress_id IS NULL AND affiliate_url ~ '/item/[0-9]{8,}';
