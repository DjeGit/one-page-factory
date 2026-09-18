-- Sprint 1 — Dimension marché (FR / ES / UK).
--
-- Un produit = un marché strict (le contenu IA — titres, FAQ, témoignages —
-- est rédigé par marché, pas partagé). "uk" sert de proxy pour tout le
-- contenu anglophone, pas seulement le Royaume-Uni géographique.

-- products : NOT NULL DEFAULT 'fr' → Postgres applique le défaut à toutes
-- les lignes existantes automatiquement, donc les 13 produits actuels
-- (tous FR à ce jour) sont correctement rétro-remplis par cette seule
-- instruction, sans UPDATE séparé nécessaire.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS market text NOT NULL DEFAULT 'fr'
  CHECK (market IN ('fr', 'es', 'uk'));

-- Référence optionnelle pour relier deux lignes "products" qui représentent
-- le même produit physique/affilié sur deux marchés différents (analytics
-- croisées ultérieures). Nullable, pas de contrainte FK stricte pour rester
-- souple (le produit référencé peut être créé après).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS source_product_ref uuid;

-- market_products : pas de défaut — chaque ligne d'étude de marché doit
-- explicitement préciser sa provenance (c'est l'objet même du Sprint 4).
-- NOT NULL ajoutée après un backfill 'fr' pour ne pas casser les lignes
-- existantes issues de l'ancien /api/market/refresh (non fiables de toute
-- façon, cf. Sprint 4 — seront regénérées par les vraies sources).
ALTER TABLE market_products ADD COLUMN IF NOT EXISTS market text;
UPDATE market_products SET market = 'fr' WHERE market IS NULL;
ALTER TABLE market_products ALTER COLUMN market SET NOT NULL;
ALTER TABLE market_products ADD CONSTRAINT market_products_market_check
  CHECK (market IN ('fr', 'es', 'uk'));

-- Source de la donnée (id d'intégration, ex. 'keepa', 'dataforseo',
-- 'amazon-scraping-fallback') — préparé pour le Sprint 3/4, vide pour
-- l'instant sur les lignes existantes.
ALTER TABLE market_products ADD COLUMN IF NOT EXISTS source text;

-- ab_tests et email_leads : dénormalisation du marché (copié depuis
-- products.market à la création) pour éviter une jointure systématique
-- sur des vues déjà filtrées par marché dans l'admin.
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS market text;
UPDATE ab_tests a SET market = p.market FROM products p WHERE a.product_id = p.id AND a.market IS NULL;
ALTER TABLE ab_tests ALTER COLUMN market SET NOT NULL;
ALTER TABLE ab_tests ADD CONSTRAINT ab_tests_market_check
  CHECK (market IN ('fr', 'es', 'uk'));

ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS market text;
UPDATE email_leads e SET market = p.market FROM products p WHERE e.product_id = p.id AND e.market IS NULL;
ALTER TABLE email_leads ALTER COLUMN market SET NOT NULL;
ALTER TABLE email_leads ADD CONSTRAINT email_leads_market_check
  CHECK (market IN ('fr', 'es', 'uk'));

-- Sprint 4/5 : distinguer produits auto-découverts / ajoutés à la main via
-- une URL d'affiliation quelconque / vendus en propre (exigence explicite :
-- "ajouter un produit à tout moment, indépendamment de l'étude de marché").
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_source text
  NOT NULL DEFAULT 'auto_discovered'
  CHECK (product_source IN ('auto_discovered', 'manual_affiliate', 'own_product'));

-- Sprint 5 : coût vs gain réel par produit.
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price numeric(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS ad_spend_allocated numeric(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2);
