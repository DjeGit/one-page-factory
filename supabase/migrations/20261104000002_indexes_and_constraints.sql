-- Audit couche données (04/11/2026) — index manquants, contraintes d'intégrité, valeur par défaut dangereuse.
--
-- POURQUOI
--  Index : les requêtes réelles du site et de l'admin (produits actifs d'un marché triés par date, produits d'une
--  catégorie, fiches liées d'un produit, clics d'une IP sur la dernière heure à CHAQUE clic /go/…, clics et vues d'un
--  produit sur une période) n'avaient pas d'index adapté : elles lisaient toute la table dès que celle-ci grossit.
--  Les index devenus inutiles (doublons d'une contrainte UNIQUE, ou préfixe d'un nouvel index) sont retirés : moins
--  d'écritures à maintenir sur clicks / page_views, qui reçoivent un enregistrement à chaque visite.
--
--  Contraintes :
--   - (aliexpress_id, market) unique : le flux automatique lit puis insère ; deux exécutions simultanées pouvaient créer
--     deux fiches pour le même produit AliExpress sur le même marché. Posée seulement s'il n'y a aucun doublon
--     aujourd'hui (voir la vérification plus bas).
--   - source_product_ref : lien entre les fiches FR/ES/UK d'un même produit. Il pointait vers un identifiant qui pouvait
--     disparaître (suppression de la fiche racine) : les autres marchés restaient reliés à « rien ». On répare l'existant,
--     on ajoute la clé étrangère, et un déclencheur promeut une autre fiche comme racine quand on supprime la racine.
--   - products.active : la valeur par défaut était TRUE, donc toute fiche créée sans préciser « active » était publiée
--     immédiatement, sans contrôle de lien affilié ni de photo. Elle devient FALSE (tous les chemins de création du projet
--     précisent déjà active explicitement).
--
-- Si l'éditeur SQL répond « relation visitors does not exist » avec une ancienne version de ce fichier : la mesure d'audience
-- (20261024000001_visitor_tracking.sql) n'a jamais été passée ; cette version saute l'index concerné.
-- Sans danger à relancer. Les index sont créés sans CONCURRENTLY (impossible dans une transaction) : ils bloquent les
-- écritures quelques secondes sur des tables de cette taille, sans conséquence.
--
-- COMMENT VÉRIFIER (SQL editor Supabase) :
--   1. select indexname from pg_indexes where indexname = 'products_aliexpress_id_market_key';
--      -> doit renvoyer une ligne. Sinon il existe des doublons : les lister avec
--      select aliexpress_id, market, count(*), array_agg(slug) from products where aliexpress_id is not null
--        group by 1, 2 having count(*) > 1;
--      puis supprimer/fusionner les doublons à la main et relancer ce script.
--   2. select conname from pg_constraint where conname = 'products_source_product_ref_fkey';  -> une ligne.
--   3. select column_default from information_schema.columns where table_name = 'products' and column_name = 'active';
--      -> false.
--   4. select count(*) from products p where p.source_product_ref is not null
--        and not exists (select 1 from products r where r.id = p.source_product_ref);  -> 0.
BEGIN;

-- ---------------------------------------------------------------- Index
-- Listes publiques : produits en ligne d'un marché, les plus récemment modifiés d'abord (accueil, top ventes, produits).
CREATE INDEX IF NOT EXISTS products_market_active_updated_idx ON products (market, active, updated_at DESC);
-- Catégories : produits en ligne d'une catégorie sur un marché (page /c/…, comptage de visibilité).
CREATE INDEX IF NOT EXISTS products_market_category_active_idx ON products (market, category_id) WHERE active;
-- Fiches liées d'un produit (market-sync, suppression, vue admin).
CREATE INDEX IF NOT EXISTS products_source_product_ref_idx ON products (source_product_ref) WHERE source_product_ref IS NOT NULL;
-- Contrôle anti-fraude de /go/… : clics d'une IP sur la dernière heure.
CREATE INDEX IF NOT EXISTS clicks_ip_hash_clicked_at_idx ON clicks (ip_hash, clicked_at DESC) WHERE ip_hash IS NOT NULL;
-- Clics / vues d'un produit sur une période (tableau de bord, rapport hebdomadaire, top produits).
CREATE INDEX IF NOT EXISTS clicks_product_clicked_at_idx ON clicks (product_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS page_views_product_viewed_at_idx ON page_views (product_id, viewed_at DESC);
-- Flux « Tendance de la semaine » : produits prêts / validés / en ligne, produits refusés.
CREATE INDEX IF NOT EXISTS trend_candidates_status_decision_idx ON trend_candidates (status, decision);
CREATE INDEX IF NOT EXISTS trend_candidates_decision_decided_idx ON trend_candidates (decision, decided_at DESC);
-- Blog : articles publiés d'un marché, les plus récents d'abord.
CREATE INDEX IF NOT EXISTS blog_posts_market_status_published_idx ON blog_posts (market, status, published_at DESC);
-- Purge nocturne des visiteurs inactifs depuis 13 mois (tous marchés confondus).
-- (la table visitors n'existe que si la migration 20261024000001_visitor_tracking.sql a été passée : sinon on saute cet index)
DO $$
BEGIN
  IF to_regclass('public.visitors') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS visitors_last_seen_idx ON visitors (last_seen);
  ELSE
    RAISE NOTICE 'table visitors absente : index visitors_last_seen_idx non créé (passer 20261024000001_visitor_tracking.sql puis relancer ce fichier)';
  END IF;
END $$;

-- Index devenus inutiles : couverts par une contrainte UNIQUE ou par le début d'un des index ci-dessus.
DROP INDEX IF EXISTS idx_products_slug;               -- doublon de la contrainte UNIQUE products.slug
DROP INDEX IF EXISTS idx_products_redirect_code;      -- doublon de la contrainte UNIQUE products.redirect_code
DROP INDEX IF EXISTS idx_clicks_product_id;           -- début de clicks_product_clicked_at_idx
DROP INDEX IF EXISTS idx_page_views_product_id;       -- début de page_views_product_viewed_at_idx
DROP INDEX IF EXISTS trend_candidates_decision_idx;   -- début de trend_candidates_decision_decided_idx
DROP INDEX IF EXISTS idx_blog_posts_market_status;    -- début de blog_posts_market_status_published_idx

-- ---------------------------------------------------------------- (aliexpress_id, market) unique
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM products WHERE aliexpress_id IS NOT NULL
    GROUP BY aliexpress_id, market HAVING count(*) > 1
  ) THEN
    RAISE WARNING 'products(aliexpress_id, market) : doublons existants, contrainte NON posée — voir la vérification 1 en tête de ce fichier';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS products_aliexpress_id_market_key
      ON products (aliexpress_id, market) WHERE aliexpress_id IS NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------- Fiches liées (source_product_ref)
-- Réparation : une fiche qui se désigne elle-même n'a pas de racine.
UPDATE products SET source_product_ref = NULL WHERE source_product_ref = id;

-- Réparation : des fiches pointent vers une racine supprimée. La plus ancienne d'entre elles devient la nouvelle racine,
-- les autres s'y rattachent (sinon la clé étrangère ci-dessous ne pourrait pas être posée).
WITH orphans AS (
  SELECT p.id, p.source_product_ref AS old_ref,
         row_number() OVER (PARTITION BY p.source_product_ref ORDER BY p.created_at, p.id) AS rn
  FROM products p
  WHERE p.source_product_ref IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM products r WHERE r.id = p.source_product_ref)
), new_roots AS (
  SELECT old_ref, id AS new_root FROM orphans WHERE rn = 1
)
UPDATE products p
SET source_product_ref = CASE WHEN p.id = nr.new_root THEN NULL ELSE nr.new_root END
FROM orphans o
JOIN new_roots nr ON nr.old_ref = o.old_ref
WHERE p.id = o.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_source_product_ref_fkey' AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_source_product_ref_fkey
      FOREIGN KEY (source_product_ref) REFERENCES products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Suppression de la fiche racine : la plus ancienne fiche liée devient la nouvelle racine et les autres s'y rattachent,
-- AVANT la suppression (sinon la clé étrangère les détacherait toutes : on perdrait le lien entre marchés).
CREATE OR REPLACE FUNCTION products_promote_root_before_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_root uuid;
BEGIN
  SELECT id INTO v_new_root
  FROM products
  WHERE source_product_ref = OLD.id
  ORDER BY created_at, id
  LIMIT 1;

  IF v_new_root IS NOT NULL THEN
    UPDATE products SET source_product_ref = NULL WHERE id = v_new_root;
    UPDATE products SET source_product_ref = v_new_root WHERE source_product_ref = OLD.id AND id <> v_new_root;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_promote_root_before_delete ON products;
CREATE TRIGGER trg_products_promote_root_before_delete
  BEFORE DELETE ON products
  FOR EACH ROW EXECUTE PROCEDURE products_promote_root_before_delete();

-- ---------------------------------------------------------------- Valeur par défaut de products.active
ALTER TABLE products ALTER COLUMN active SET DEFAULT false;

COMMIT;
