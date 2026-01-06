-- PriceMap Initial Schema
-- All tables use 'pricewaze_' prefix
-- Using existing sujeto10 Supabase project

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Custom ENUM types
DO $$ BEGIN
  CREATE TYPE pricewaze_property_type AS ENUM ('apartment', 'house', 'land', 'commercial', 'office');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pricewaze_offer_status AS ENUM ('pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pricewaze_visit_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pricewaze_property_status AS ENUM ('active', 'pending', 'sold', 'inactive');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pricewaze_user_role AS ENUM ('buyer', 'seller', 'agent', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS pricewaze_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role pricewaze_user_role DEFAULT 'buyer',
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Zones table with PostGIS boundaries
CREATE TABLE IF NOT EXISTS pricewaze_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  boundary GEOMETRY(POLYGON, 4326),
  avg_price_m2 DECIMAL(12,2),
  total_listings INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Properties table with PostGIS location
CREATE TABLE IF NOT EXISTS pricewaze_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES pricewaze_profiles(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES pricewaze_zones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  property_type pricewaze_property_type NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  area_m2 DECIMAL(10,2) NOT NULL,
  price_per_m2 DECIMAL(12,2) GENERATED ALWAYS AS (price / NULLIF(area_m2, 0)) STORED,
  bedrooms INTEGER,
  bathrooms INTEGER,
  parking_spaces INTEGER,
  year_built INTEGER,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  location GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
  images TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  status pricewaze_property_status DEFAULT 'active',
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Property price history
CREATE TABLE IF NOT EXISTS pricewaze_property_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  price DECIMAL(15,2) NOT NULL,
  price_per_m2 DECIMAL(12,2) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Offers table with counter-offer chain
CREATE TABLE IF NOT EXISTS pricewaze_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES pricewaze_profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES pricewaze_profiles(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  message TEXT,
  status pricewaze_offer_status DEFAULT 'pending',
  parent_offer_id UUID REFERENCES pricewaze_offers(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Visits table with GPS verification
CREATE TABLE IF NOT EXISTS pricewaze_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES pricewaze_profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES pricewaze_profiles(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  verification_code TEXT NOT NULL DEFAULT LPAD(FLOOR(random() * 1000000)::TEXT, 6, '0'),
  verified_at TIMESTAMPTZ,
  verification_latitude DECIMAL(10,8),
  verification_longitude DECIMAL(11,8),
  status pricewaze_visit_status DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agreements (AI-generated contracts)
CREATE TABLE IF NOT EXISTS pricewaze_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES pricewaze_offers(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES pricewaze_profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES pricewaze_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  final_price DECIMAL(15,2) NOT NULL,
  terms JSONB DEFAULT '{}',
  signed_by_buyer BOOLEAN DEFAULT false,
  signed_by_seller BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS pricewaze_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES pricewaze_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Favorites
CREATE TABLE IF NOT EXISTS pricewaze_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES pricewaze_profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, property_id)
);

-- Property views tracking
CREATE TABLE IF NOT EXISTS pricewaze_property_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES pricewaze_profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricewaze_properties_location ON pricewaze_properties USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_pricewaze_properties_zone ON pricewaze_properties(zone_id);
CREATE INDEX IF NOT EXISTS idx_pricewaze_properties_owner ON pricewaze_properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_pricewaze_properties_status ON pricewaze_properties(status);
CREATE INDEX IF NOT EXISTS idx_pricewaze_properties_type ON pricewaze_properties(property_type);
CREATE INDEX IF NOT EXISTS idx_pricewaze_properties_price ON pricewaze_properties(price);
CREATE INDEX IF NOT EXISTS idx_pricewaze_zones_boundary ON pricewaze_zones USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_pricewaze_offers_property ON pricewaze_offers(property_id);
CREATE INDEX IF NOT EXISTS idx_pricewaze_offers_buyer ON pricewaze_offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_pricewaze_offers_status ON pricewaze_offers(status);
CREATE INDEX IF NOT EXISTS idx_pricewaze_visits_property ON pricewaze_visits(property_id);
CREATE INDEX IF NOT EXISTS idx_pricewaze_visits_visitor ON pricewaze_visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_pricewaze_notifications_user ON pricewaze_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_pricewaze_favorites_user ON pricewaze_favorites(user_id);

-- Trigger function to update timestamps
CREATE OR REPLACE FUNCTION pricewaze_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
DROP TRIGGER IF EXISTS pricewaze_profiles_updated ON pricewaze_profiles;
CREATE TRIGGER pricewaze_profiles_updated BEFORE UPDATE ON pricewaze_profiles
  FOR EACH ROW EXECUTE FUNCTION pricewaze_update_updated_at();

DROP TRIGGER IF EXISTS pricewaze_zones_updated ON pricewaze_zones;
CREATE TRIGGER pricewaze_zones_updated BEFORE UPDATE ON pricewaze_zones
  FOR EACH ROW EXECUTE FUNCTION pricewaze_update_updated_at();

DROP TRIGGER IF EXISTS pricewaze_properties_updated ON pricewaze_properties;
CREATE TRIGGER pricewaze_properties_updated BEFORE UPDATE ON pricewaze_properties
  FOR EACH ROW EXECUTE FUNCTION pricewaze_update_updated_at();

DROP TRIGGER IF EXISTS pricewaze_offers_updated ON pricewaze_offers;
CREATE TRIGGER pricewaze_offers_updated BEFORE UPDATE ON pricewaze_offers
  FOR EACH ROW EXECUTE FUNCTION pricewaze_update_updated_at();

DROP TRIGGER IF EXISTS pricewaze_visits_updated ON pricewaze_visits;
CREATE TRIGGER pricewaze_visits_updated BEFORE UPDATE ON pricewaze_visits
  FOR EACH ROW EXECUTE FUNCTION pricewaze_update_updated_at();

DROP TRIGGER IF EXISTS pricewaze_agreements_updated ON pricewaze_agreements;
CREATE TRIGGER pricewaze_agreements_updated BEFORE UPDATE ON pricewaze_agreements
  FOR EACH ROW EXECUTE FUNCTION pricewaze_update_updated_at();

-- Trigger to auto-assign zone based on location
CREATE OR REPLACE FUNCTION pricewaze_auto_assign_zone()
RETURNS TRIGGER AS $$
BEGIN
  SELECT id INTO NEW.zone_id
  FROM pricewaze_zones
  WHERE ST_Contains(boundary, NEW.location)
  LIMIT 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricewaze_properties_assign_zone ON pricewaze_properties;
CREATE TRIGGER pricewaze_properties_assign_zone BEFORE INSERT OR UPDATE ON pricewaze_properties
  FOR EACH ROW EXECUTE FUNCTION pricewaze_auto_assign_zone();

-- Trigger to track price history
CREATE OR REPLACE FUNCTION pricewaze_track_price_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO pricewaze_property_price_history (property_id, price, price_per_m2)
    VALUES (NEW.id, NEW.price, NEW.price_per_m2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricewaze_properties_price_history ON pricewaze_properties;
CREATE TRIGGER pricewaze_properties_price_history AFTER UPDATE ON pricewaze_properties
  FOR EACH ROW EXECUTE FUNCTION pricewaze_track_price_history();

-- Trigger to create profile on auth signup
CREATE OR REPLACE FUNCTION pricewaze_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pricewaze_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS pricewaze_on_auth_user_created ON auth.users;
CREATE TRIGGER pricewaze_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION pricewaze_handle_new_user();

-- Row Level Security (RLS) Policies
ALTER TABLE pricewaze_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_property_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_property_views ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON pricewaze_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON pricewaze_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON pricewaze_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Zones policies (public read)
CREATE POLICY "Zones are viewable by everyone" ON pricewaze_zones FOR SELECT USING (true);

-- Properties policies
CREATE POLICY "Active properties are viewable by everyone" ON pricewaze_properties
  FOR SELECT USING (status = 'active' OR owner_id = auth.uid());
CREATE POLICY "Users can insert own properties" ON pricewaze_properties
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own properties" ON pricewaze_properties
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own properties" ON pricewaze_properties
  FOR DELETE USING (auth.uid() = owner_id);

-- Price history policies
CREATE POLICY "Price history viewable for visible properties" ON pricewaze_property_price_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pricewaze_properties WHERE id = property_id AND (status = 'active' OR owner_id = auth.uid()))
  );

-- Offers policies
CREATE POLICY "Users can view offers they're part of" ON pricewaze_offers
  FOR SELECT USING (auth.uid() IN (buyer_id, seller_id));
CREATE POLICY "Buyers can create offers" ON pricewaze_offers
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update offers" ON pricewaze_offers
  FOR UPDATE USING (auth.uid() IN (buyer_id, seller_id));

-- Visits policies
CREATE POLICY "Users can view visits they're part of" ON pricewaze_visits
  FOR SELECT USING (auth.uid() IN (visitor_id, owner_id));
CREATE POLICY "Visitors can create visits" ON pricewaze_visits
  FOR INSERT WITH CHECK (auth.uid() = visitor_id);
CREATE POLICY "Participants can update visits" ON pricewaze_visits
  FOR UPDATE USING (auth.uid() IN (visitor_id, owner_id));

-- Agreements policies
CREATE POLICY "Users can view agreements they're part of" ON pricewaze_agreements
  FOR SELECT USING (auth.uid() IN (buyer_id, seller_id));
CREATE POLICY "System can create agreements" ON pricewaze_agreements
  FOR INSERT WITH CHECK (auth.uid() IN (buyer_id, seller_id));
CREATE POLICY "Participants can update agreements" ON pricewaze_agreements
  FOR UPDATE USING (auth.uid() IN (buyer_id, seller_id));

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON pricewaze_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON pricewaze_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view own favorites" ON pricewaze_favorites
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own favorites" ON pricewaze_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON pricewaze_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Property views policies
CREATE POLICY "Anyone can insert views" ON pricewaze_property_views
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Property owners can view their property views" ON pricewaze_property_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pricewaze_properties WHERE id = property_id AND owner_id = auth.uid())
  );
