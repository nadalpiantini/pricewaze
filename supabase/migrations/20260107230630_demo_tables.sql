-- W1.2 DEMO TABLES
-- Separate demo tables for onboarding experience
-- These tables are isolated from production data

-- ============================================================================
-- DEMO PROPERTIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_properties_demo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  lat NUMERIC(10, 7) NOT NULL,
  lng NUMERIC(10, 7) NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  property_type TEXT DEFAULT 'apartment',
  area_m2 NUMERIC(8, 2),
  bedrooms INTEGER,
  bathrooms INTEGER,
  parking_spaces INTEGER,
  year_built INTEGER,
  images TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- DEMO SIGNAL STATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_property_signal_state_demo (
  property_id UUID NOT NULL REFERENCES pricewaze_properties_demo(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  strength NUMERIC(5, 2) DEFAULT 1.0,
  confirmed BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (property_id, signal_type)
);

-- ============================================================================
-- INSERT DEMO DATA (W1.2 - Perfect Demo Data)
-- ============================================================================

-- Property A: High pressure (red)
INSERT INTO pricewaze_properties_demo (
  id, title, price, lat, lng, address, description,
  property_type, area_m2, bedrooms, bathrooms, parking_spaces, year_built,
  images, features
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Modern Apartment in Piantini',
  255000,
  18.4663,
  -69.9411,
  'Piantini, Santo Domingo',
  'Well-located apartment, high recent demand.',
  'apartment',
  120,
  3,
  2,
  1,
  2018,
  ARRAY['/placeholder-property.jpg', '/placeholder-property.jpg', '/placeholder-property.jpg'],
  ARRAY['Balcony', 'Modern Kitchen', 'Parking', 'Security']
) ON CONFLICT (id) DO NOTHING;

-- Property B: Weak signals (gray)
INSERT INTO pricewaze_properties_demo (
  id, title, price, lat, lng, address, description,
  property_type, area_m2, bedrooms, bathrooms, parking_spaces, year_built,
  images, features
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Family Home in Arroyo Hondo',
  210000,
  18.4945,
  -69.9592,
  'Arroyo Hondo, Santo Domingo',
  'Spacious property with visible details during visits.',
  'house',
  200,
  4,
  3,
  2,
  2015,
  ARRAY['/placeholder-property.jpg', '/placeholder-property.jpg'],
  ARRAY['Garden', 'Garage', 'Security System']
) ON CONFLICT (id) DO NOTHING;

-- Property C: Clean (blue)
INSERT INTO pricewaze_properties_demo (
  id, title, price, lat, lng, address, description,
  property_type, area_m2, bedrooms, bathrooms, parking_spaces, year_built,
  images, features
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Apartment in Emerging Zone',
  175000,
  18.4519,
  -69.9327,
  'Ensanche Luperón, Santo Domingo',
  'Zone with low turnover and little recent movement.',
  'apartment',
  85,
  2,
  1,
  0,
  2012,
  ARRAY['/placeholder-property.jpg'],
  ARRAY['Furnished']
) ON CONFLICT (id) DO NOTHING;

-- Property A signals: High pressure
INSERT INTO pricewaze_property_signal_state_demo (property_id, signal_type, strength, confirmed, last_seen_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'many_visits', 7, true, now()),
  ('11111111-1111-1111-1111-111111111111', 'competing_offers', 3, true, now())
ON CONFLICT (property_id, signal_type) DO UPDATE SET
  strength = EXCLUDED.strength,
  confirmed = EXCLUDED.confirmed,
  last_seen_at = EXCLUDED.last_seen_at,
  updated_at = now();

-- Property B signals: Weak signals (friction)
INSERT INTO pricewaze_property_signal_state_demo (property_id, signal_type, strength, confirmed, last_seen_at)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'noise', 2, false, now()),
  ('22222222-2222-2222-2222-222222222222', 'humidity', 1, false, now())
ON CONFLICT (property_id, signal_type) DO UPDATE SET
  strength = EXCLUDED.strength,
  confirmed = EXCLUDED.confirmed,
  last_seen_at = EXCLUDED.last_seen_at,
  updated_at = now();

-- Property C: No signals (clean)

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_properties_demo_location ON pricewaze_properties_demo(lat, lng);
CREATE INDEX IF NOT EXISTS idx_signal_state_demo_property ON pricewaze_property_signal_state_demo(property_id);

-- ============================================================================
-- RLS POLICIES (Allow public read for demo)
-- ============================================================================
ALTER TABLE pricewaze_properties_demo ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_property_signal_state_demo ENABLE ROW LEVEL SECURITY;

-- Allow public read access for demo tables
CREATE POLICY "Allow public read on demo properties"
  ON pricewaze_properties_demo
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public read on demo signal states"
  ON pricewaze_property_signal_state_demo
  FOR SELECT
  USING (true);

