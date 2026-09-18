-- Sprint 2 (rapport "OPF — Compléments à prévoir", 18/09) — Module
-- factures/avoirs, greffé sur le Répertoire existant (email_leads) plutôt
-- que sur un système séparé : chaque facture référence un contact_id.
--
-- Numérotation légale : un numéro de facture doit être strictement
-- séquentiel et sans trou par entité (art. 289 CGI en France). On
-- attribue le numéro UNIQUEMENT à la finalisation (passage à 'sent'),
-- jamais au brouillon — voir lib/invoice-numbering.ts et la fonction SQL
-- next_invoice_number ci-dessous, qui fait l'incrément de façon atomique
-- (INSERT ... ON CONFLICT DO UPDATE ... RETURNING en une seule requête,
-- pas de lecture puis écriture côté application qui risquerait une
-- collision sous accès concurrent). Une séquence par (marché, année, type
-- de document) : les avoirs ont leur propre suite, pas mêlée à celle des
-- factures (la loi n'exige la continuité qu'au sein d'une même série).

CREATE TABLE IF NOT EXISTS invoice_number_sequences (
  market text NOT NULL CHECK (market IN ('fr', 'es', 'uk')),
  year int NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('invoice', 'credit_note')),
  next_number int NOT NULL DEFAULT 1,
  PRIMARY KEY (market, year, doc_type)
);

ALTER TABLE invoice_number_sequences ENABLE ROW LEVEL SECURITY;
-- Aucune policy anon/authenticated : service_role uniquement, même logique
-- que la migration RLS du Sprint 0 et la table integrations du Sprint 3.

CREATE OR REPLACE FUNCTION next_invoice_number(p_market text, p_year int, p_doc_type text)
RETURNS int AS $$
DECLARE
  v_next int;
BEGIN
  INSERT INTO invoice_number_sequences (market, year, doc_type, next_number)
  VALUES (p_market, p_year, p_doc_type, 2)
  ON CONFLICT (market, year, doc_type)
  DO UPDATE SET next_number = invoice_number_sequences.next_number + 1
  RETURNING next_number - 1 INTO v_next;
  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL tant que la facture est en brouillon ; attribué à l'envoi, jamais
  -- réutilisé (UNIQUE autorise plusieurs NULL, ce qui est voulu ici).
  invoice_number text UNIQUE,
  type text NOT NULL DEFAULT 'invoice' CHECK (type IN ('invoice', 'credit_note')),
  contact_id uuid NOT NULL REFERENCES email_leads(id) ON DELETE RESTRICT,
  market text NOT NULL CHECK (market IN ('fr', 'es', 'uk')),
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  -- [{description, quantity, unit_price, tax_rate}] — pas de table lignes
  -- séparée : une facture est éditée/lue comme un tout, jamais ligne par
  -- ligne indépendamment, jsonb évite une jointure systématique pour ça.
  line_items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  tax_rate numeric(5, 2) NOT NULL DEFAULT 0,
  tax_amount numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  issued_at timestamptz,
  due_at timestamptz,
  notes text,
  -- Avoir : référence la facture qu'il annule/corrige. NULL pour une
  -- facture normale.
  credit_note_of uuid REFERENCES invoices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_contact_id ON invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_market ON invoices(market);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- Aucune policy anon/authenticated : service_role uniquement.

CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE PROCEDURE update_invoices_updated_at();
