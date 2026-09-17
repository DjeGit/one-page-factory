-- Sprint 1 — Index pour les requêtes filtrées par marché (cas dominant :
-- dashboard/admin sur produits actifs d'un seul marché à la fois).

CREATE INDEX IF NOT EXISTS idx_products_market ON products(market) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_market_products_market ON market_products(market);
CREATE INDEX IF NOT EXISTS idx_ab_tests_market ON ab_tests(market);
CREATE INDEX IF NOT EXISTS idx_email_leads_market ON email_leads(market);
CREATE INDEX IF NOT EXISTS idx_products_product_source ON products(product_source);
