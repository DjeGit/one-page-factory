-- Répertoire de contacts — catégorie "Partenaires" + envoi d'email réel
-- depuis l'admin (demandé par Jerome le 22/09) : jusqu'ici "Envoyer un
-- mail" dans ContactDetailPanel n'ouvrait qu'un lien mailto:, sans boîte
-- mail dédiée branchée (voir contacts_directory.sql, 18/09). Le domaine
-- tendpick.com est désormais authentifié côté Brevo (DKIM+DMARC) avec
-- contact@tendpick.com comme expéditeur vérifié — cette migration ajoute
-- ce qu'il faut côté DB pour un vrai envoi + un historique.

-- 1. Troisième catégorie manuelle du Répertoire, à côté de client/fournisseur.
--    'lead' (capture auto) n'est pas concerné, inchangé.
DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'email_leads'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%contact_type%'
  LOOP
    EXECUTE format('ALTER TABLE email_leads DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE email_leads ADD CONSTRAINT email_leads_contact_type_check
  CHECK (contact_type IN ('lead', 'client', 'fournisseur', 'partenaire'));

-- 2. Historique des emails envoyés manuellement à un contact depuis
--    l'admin (distinct des séquences de relance automatiques du module
--    nurture, Sprint 3, qui ne passent pas par cette table). Une ligne par
--    tentative d'envoi, y compris en échec (status='failed' + error),
--    pour que l'admin voie ce qui n'est pas parti plutôt que de croire à
--    tort qu'un message a été envoyé.
CREATE TABLE IF NOT EXISTS contact_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES email_leads(id) ON DELETE CASCADE,
  sender_email text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_emails_contact_id ON contact_emails(contact_id, created_at DESC);

ALTER TABLE contact_emails ENABLE ROW LEVEL SECURITY;
-- Aucune policy anon/authenticated : service_role uniquement, même
-- logique que scheduled_posts / integrations / invoice_number_sequences.
