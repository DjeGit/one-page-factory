-- Audit couche données (04/11/2026) — fonctions SQL qui remplacent des séries de requêtes, + durcissement.
--
-- POURQUOI
--  1. Tableau de bord, liste des produits, ROI et comptage des catégories faisaient jusqu'à 2 requêtes PAR produit
--     (ou 4 requêtes dont l'URL contenait tous les identifiants de produits, ce qui dépasse la limite d'URL au-delà
--     de quelques centaines de produits). Une fonction SQL = UN aller-retour, quel que soit le nombre de produits.
--     Le code (lib/analytics/stats.ts) appelle ces fonctions et retombe tout seul sur l'ancienne méthode tant que cette
--     migration n'est pas appliquée : on peut la passer quand on veut, sans casser le site.
--  2. Mesure d'audience : opf_record_visit remplace « lire puis écrire » (deux onglets ouverts en même temps perdaient
--     une visite) par une seule opération atomique.
--  3. Compteurs A/B : opf_ab_test_bump incrémente en une opération (lire puis réécrire perdait des clics/vues).
--  4. RGPD : clicks et page_views gardaient pour toujours l'IP hachée, le user-agent et le referer. Ils sont désormais
--     effacés au bout de 30 jours (les totaux restent) ; c'est le cron nocturne « purge-visits » existant, qui appelle
--     déjà purge_visitor_data(), qui s'en charge — aucun changement de code nécessaire.
--  5. Sécurité : les fonctions SQL sont appelables par n'importe qui avec la clé publique (anon) via l'API REST de
--     Supabase, sauf si on retire le droit. Elles s'exécutent avec les droits de l'appelant (donc bloquées par RLS), mais
--     on retire aussi le droit d'appel : seul le serveur (service_role) peut les lancer.
--
-- Sans danger à relancer (CREATE OR REPLACE / REVOKE / GRANT sont idempotents).
--
-- COMMENT VÉRIFIER (SQL editor Supabase), les trois doivent répondre sans erreur :
--   select * from opf_dashboard_stats('fr', date_trunc('day', now()));
--   select product_id, name, clicks, views from opf_product_counts('fr') limit 5;
--   select * from opf_category_product_counts();
-- Puis, dans le journal du serveur, le message « fonction SQL opf_… absente » ne doit plus apparaître.
BEGIN;

-- Compteurs du tableau de bord pour un marché ; p_since = début de « aujourd'hui » (calculé par l'application).
CREATE OR REPLACE FUNCTION opf_dashboard_stats(p_market text, p_since timestamptz)
RETURNS TABLE (
  total_products  bigint,
  active_products bigint,
  clicks_today    bigint,
  views_today     bigint,
  total_clicks    bigint,
  total_views     bigint
)
LANGUAGE sql STABLE
AS $$
  WITH prods AS (SELECT p.id, p.active FROM products p WHERE p.market = p_market)
  SELECT
    (SELECT count(*) FROM prods),
    (SELECT count(*) FROM prods WHERE prods.active),
    (SELECT count(*) FROM clicks c     JOIN prods ON prods.id = c.product_id WHERE c.clicked_at >= p_since),
    (SELECT count(*) FROM page_views v JOIN prods ON prods.id = v.product_id WHERE v.viewed_at  >= p_since),
    (SELECT count(*) FROM clicks c     JOIN prods ON prods.id = c.product_id),
    (SELECT count(*) FROM page_views v JOIN prods ON prods.id = v.product_id);
$$;

-- Clics et vues par produit (tous marchés si p_market est NULL ; un seul produit si p_product_id est renseigné).
-- p_since NULL = pas de colonnes « depuis » (elles valent 0).
CREATE OR REPLACE FUNCTION opf_product_counts(
  p_market     text        DEFAULT NULL,
  p_product_id uuid        DEFAULT NULL,
  p_since      timestamptz DEFAULT NULL
)
RETURNS TABLE (
  product_id   uuid,
  name         text,
  slug         text,
  price        numeric,
  clicks       bigint,
  views        bigint,
  clicks_since bigint,
  views_since  bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id, p.name, p.slug, p.price,
    (SELECT count(*) FROM clicks c     WHERE c.product_id = p.id),
    (SELECT count(*) FROM page_views v WHERE v.product_id = p.id),
    CASE WHEN p_since IS NULL THEN 0::bigint
         ELSE (SELECT count(*) FROM clicks c     WHERE c.product_id = p.id AND c.clicked_at >= p_since) END,
    CASE WHEN p_since IS NULL THEN 0::bigint
         ELSE (SELECT count(*) FROM page_views v WHERE v.product_id = p.id AND v.viewed_at  >= p_since) END
  FROM products p
  WHERE (p_market IS NULL OR p.market = p_market)
    AND (p_product_id IS NULL OR p.id = p_product_id)
  ORDER BY p.created_at DESC, p.id;
$$;

-- Produits en ligne par catégorie et par marché (visibilité automatique des catégories).
CREATE OR REPLACE FUNCTION opf_category_product_counts()
RETURNS TABLE (category_id uuid, market text, n bigint)
LANGUAGE sql STABLE
AS $$
  SELECT p.category_id, p.market, count(*)
  FROM products p
  WHERE p.active AND p.category_id IS NOT NULL
  GROUP BY p.category_id, p.market;
$$;

-- Page vue de la mesure d'audience, en une opération atomique : crée le visiteur ou met à jour sa dernière visite
-- (+1 visite seulement au début d'une nouvelle session), puis enregistre la page. Renvoie l'id de la ligne page_visits.
CREATE OR REPLACE FUNCTION opf_record_visit(
  p_visitor_id    uuid,
  p_market        text,
  p_session_id    text,
  p_path          text,
  p_page_type     text,
  p_referrer_host text,
  p_new_session   boolean
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO visitors (visitor_id, market)
  VALUES (p_visitor_id, p_market)
  ON CONFLICT (visitor_id) DO UPDATE
    SET last_seen   = now(),
        visit_count = visitors.visit_count + CASE WHEN p_new_session THEN 1 ELSE 0 END;

  INSERT INTO page_visits (visitor_id, session_id, market, path, page_type, referrer_host)
  VALUES (p_visitor_id, p_session_id, p_market, p_path, p_page_type, p_referrer_host)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- +1 sur un compteur A/B (liste blanche des colonnes : le nom vient du navigateur).
CREATE OR REPLACE FUNCTION opf_ab_test_bump(p_test_id uuid, p_field text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_field NOT IN ('variant_a_views', 'variant_a_clicks', 'variant_b_views', 'variant_b_clicks') THEN
    RAISE EXCEPTION 'compteur A/B inconnu : %', p_field;
  END IF;
  EXECUTE format('UPDATE ab_tests SET %1$I = COALESCE(%1$I, 0) + 1 WHERE id = $1', p_field) USING p_test_id;
END;
$$;

-- RGPD : efface l'IP hachée, le user-agent et le referer des clics / vues de plus de 30 jours (les lignes et donc les
-- totaux restent). Renvoie le nombre de lignes nettoyées. La déduplication des vues ne dépend que du jour : inchangée.
CREATE OR REPLACE FUNCTION purge_traffic_identifiers(retention interval DEFAULT interval '30 days')
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  n_clicks integer;
  n_views  integer;
BEGIN
  UPDATE clicks
     SET ip_hash = NULL, user_agent = NULL, referer = NULL
   WHERE clicked_at < now() - retention
     AND (ip_hash IS NOT NULL OR user_agent IS NOT NULL OR referer IS NOT NULL);
  GET DIAGNOSTICS n_clicks = ROW_COUNT;

  UPDATE page_views
     SET ip_hash = NULL, user_agent = NULL, referer = NULL
   WHERE viewed_at < now() - retention
     AND (ip_hash IS NOT NULL OR user_agent IS NOT NULL OR referer IS NOT NULL);
  GET DIAGNOSTICS n_views = ROW_COUNT;

  RETURN n_clicks + n_views;
END;
$$;

-- Même signature qu'avant (le cron /api/cron/purge-visits l'appelle sans argument) ; ajoute le nettoyage ci-dessus.
-- Renvoie toujours le nombre de visiteurs supprimés.
CREATE OR REPLACE FUNCTION purge_visitor_data(retention interval DEFAULT interval '13 months')
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  removed integer;
BEGIN
  DELETE FROM visitors WHERE last_seen < now() - retention;
  GET DIAGNOSTICS removed = ROW_COUNT;
  PERFORM purge_traffic_identifiers();
  RETURN removed;
END;
$$;

-- Droits : seul le serveur (service_role) peut appeler ces fonctions, jamais la clé publique.
REVOKE ALL ON FUNCTION opf_dashboard_stats(text, timestamptz)                              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION opf_product_counts(text, uuid, timestamptz)                         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION opf_category_product_counts()                                       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION opf_record_visit(uuid, text, text, text, text, text, boolean)       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION opf_ab_test_bump(uuid, text)                                        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION purge_traffic_identifiers(interval)                                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION purge_visitor_data(interval)                                        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION next_invoice_number(text, int, text)                                FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION opf_dashboard_stats(text, timestamptz)                           TO service_role;
GRANT EXECUTE ON FUNCTION opf_product_counts(text, uuid, timestamptz)                      TO service_role;
GRANT EXECUTE ON FUNCTION opf_category_product_counts()                                    TO service_role;
GRANT EXECUTE ON FUNCTION opf_record_visit(uuid, text, text, text, text, text, boolean)    TO service_role;
GRANT EXECUTE ON FUNCTION opf_ab_test_bump(uuid, text)                                     TO service_role;
GRANT EXECUTE ON FUNCTION purge_traffic_identifiers(interval)                              TO service_role;
GRANT EXECUTE ON FUNCTION purge_visitor_data(interval)                                     TO service_role;
GRANT EXECUTE ON FUNCTION next_invoice_number(text, int, text)                             TO service_role;

COMMIT;
