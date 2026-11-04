-- Audit couche données (04/11/2026) — ne plus perdre les e-mails collectés quand on supprime un produit.
--
-- Constat : email_leads.product_id était « ON DELETE CASCADE » (schéma features_schema.sql). Supprimer une fiche
-- produit effaçait donc, sans avertissement, tous les contacts captés depuis cette fiche (adresses, consentement,
-- statut de relance). Ces contacts ont de la valeur et ne dépendent pas de la fiche : on les garde, détachés
-- (product_id devient NULL ; source_slug conserve l'origine).
--
-- Reste inchangé : clics, vues et tests A/B d'un produit supprimé partent avec lui (statistiques de ce produit seulement).
-- Sans danger à relancer.
--
-- COMMENT VÉRIFIER (SQL editor Supabase) :
--   select conname, confdeltype from pg_constraint
--   where conrelid = 'email_leads'::regclass and confrelid = 'products'::regclass;
--   -> confdeltype = 'n' (SET NULL) ; avant la migration : 'c' (CASCADE).
BEGIN;

DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'email_leads'::regclass
      AND confrelid = 'products'::regclass
      AND contype = 'f'
      AND confdeltype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE email_leads DROP CONSTRAINT %I', con.conname);
    ALTER TABLE email_leads
      ADD CONSTRAINT email_leads_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
  END LOOP;
END $$;

COMMIT;
