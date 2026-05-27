-- A/B Testing
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Test A/B',
  -- Variant A (original)
  variant_a_title TEXT,
  variant_a_subtitle TEXT,
  variant_a_cta TEXT DEFAULT 'Acheter maintenant',
  variant_a_views INTEGER DEFAULT 0,
  variant_a_clicks INTEGER DEFAULT 0,
  -- Variant B (challenger)
  variant_b_title TEXT,
  variant_b_subtitle TEXT,
  variant_b_cta TEXT DEFAULT 'Commander maintenant',
  variant_b_views INTEGER DEFAULT 0,
  variant_b_clicks INTEGER DEFAULT 0,
  -- Status
  winner TEXT CHECK (winner IN ('a', 'b', null)),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email leads
CREATE TABLE IF NOT EXISTS email_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  source_slug TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_leads_unique ON email_leads(email, product_id);
CREATE INDEX IF NOT EXISTS idx_email_leads_product ON email_leads(product_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_product ON ab_tests(product_id);

-- Add columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS pixel_meta TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pixel_tiktok TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pixel_gtm TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS affiliate_url_2 TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS affiliate_url_3 TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS geo_pricing JSONB DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS email_capture_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS email_capture_discount INTEGER DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS exit_intent_enabled BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS social_proof_enabled BOOLEAN DEFAULT true;
