-- Table veille concurrentielle
CREATE TABLE IF NOT EXISTS market_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),
  price_avg DECIMAL(10,2),
  best_offer TEXT,
  best_offer_price DECIMAL(10,2),
  platforms JSONB DEFAULT '[]',
  confidence_score INTEGER DEFAULT 5 CHECK (confidence_score BETWEEN 1 AND 10),
  trend_score INTEGER DEFAULT 5 CHECK (trend_score BETWEEN 1 AND 10),
  source_notes TEXT,
  last_refreshed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_products_category ON market_products(category);
CREATE INDEX IF NOT EXISTS idx_market_products_trend ON market_products(trend_score DESC);
