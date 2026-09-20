-- Sprint 5 (complément demandé par Jerome le 20/09, suite à sa question sur
-- la fiabilité des "vues" affichées par marché dans /admin) :
--
-- Constat : total_views (lib/supabase.ts:getDashboardStats) est un simple
-- COUNT() sur page_views, alimenté sans aucun filtrage bot ni déduplication
-- — un crawler ou un rechargement de page compte comme une vue au même
-- titre qu'un vrai visiteur. Le filtrage des bots connus se fait côté
-- application (lib/bot-detection.ts, appliqué avant l'insert). Cette
-- migration ajoute le filet côté DB pour la déduplication : au plus une vue
-- comptée par IP hashée, par produit, par jour.
--
-- viewed_date est une colonne générée (pas de backfill nécessaire, calculée
-- à la volée y compris pour les lignes existantes) qui sert de clé de
-- dédup grossière — un même visiteur qui revient le lendemain compte de
-- nouveau comme une vue, ce qui est le comportement voulu (mesurer le
-- trafic réel, pas des visiteurs uniques all-time).
ALTER TABLE page_views
  ADD COLUMN IF NOT EXISTS viewed_date date GENERATED ALWAYS AS ((viewed_at AT TIME ZONE 'utc')::date) STORED;

-- Pas de clause WHERE (index non-partiel) : ip_hash n'est jamais NULL en
-- pratique (hashIp() hache toujours une valeur, même 'unknown'), et un
-- index non-partiel est ce que l'upsert onConflict de supabase-js sait
-- cibler simplement côté PostgREST.
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_views_dedup
  ON page_views (product_id, ip_hash, viewed_date);
