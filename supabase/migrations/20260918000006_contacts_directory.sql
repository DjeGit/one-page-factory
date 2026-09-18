-- Répertoire de contacts (18/09) — transforme email_leads en table à la
-- fois "leads capturés automatiquement" (comportement existant, inchangé)
-- ET "contacts ajoutés manuellement" (client / fournisseur), demandé par
-- Jerome pour la section Leads & Emails du back-office.
--
-- email devient nullable : un fournisseur ajouté à la main peut n'avoir
-- au départ qu'un téléphone. La validation "email ou téléphone requis"
-- est faite côté application (app/api/leads/route.ts), pas en DB.

ALTER TABLE email_leads ALTER COLUMN email DROP NOT NULL;

ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS contact_type text NOT NULL DEFAULT 'lead'
  CHECK (contact_type IN ('lead', 'client', 'fournisseur'));

-- markets (tableau) permet à un contact ajouté manuellement d'être
-- rattaché à un, deux, ou les trois marchés en même temps (sélecteur
-- drapeaux côté UI) — contrairement à `market` (singulier, NOT NULL,
-- existant) qui reste le marché "principal", conservé tel quel pour ne
-- pas casser l'export CSV et la sync Brevo déjà branchés dessus.
-- Rétro-remplissage des lignes existantes (leads auto-capturés) : leur
-- unique marché devient un tableau à un élément.
ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS markets text[] NOT NULL DEFAULT '{}';
UPDATE email_leads SET markets = ARRAY[market] WHERE markets = '{}';

CREATE INDEX IF NOT EXISTS idx_email_leads_contact_type ON email_leads(contact_type);
CREATE INDEX IF NOT EXISTS idx_email_leads_markets ON email_leads USING GIN(markets);
