-- Audit 21/09 : verrou anti-double-publication sur /api/cron/social-publish.
-- Le cron sélectionnait tous les posts 'pending' dus puis les publiait dans
-- une boucle ; si deux exécutions du cron se chevauchent (dépassement de la
-- minute précédente), les DEUX pouvaient appeler channel.publish() pour le
-- MÊME post avant qu'aucune des deux n'ait écrit son statut final —
-- publication réelle en double sur le réseau social (le .eq('status',
-- 'pending') sur l'écriture finale protège la ligne DB, pas l'appel réseau
-- sortant qui a déjà eu lieu deux fois à ce moment-là).
--
-- Un statut intermédiaire 'processing', posé par une UPDATE...WHERE
-- status='pending' juste AVANT l'appel à publish(), rend la réclamation du
-- post atomique : la seconde exécution concurrente ne trouve plus aucune
-- ligne 'pending' à réclamer pour ce post et le saute (voir
-- app/api/cron/social-publish/route.ts).
DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'scheduled_posts'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE scheduled_posts DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE scheduled_posts ADD CONSTRAINT scheduled_posts_status_check
  CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled'));
