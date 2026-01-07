-- Smart Visit Planner: Route Planning Tables
-- Clean, production-ready schema for multi-stop property visit optimization

-- Visit Routes table
CREATE TABLE IF NOT EXISTS pricewaze_visit_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Visit Stops table (properties in the route)
CREATE TABLE IF NOT EXISTS pricewaze_visit_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES pricewaze_visit_routes(id) ON DELETE CASCADE,
  property_id UUID REFERENCES pricewaze_properties(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_visit_routes_user_id ON pricewaze_visit_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_stops_route_id ON pricewaze_visit_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_visit_stops_order ON pricewaze_visit_stops(route_id, order_index);
CREATE INDEX IF NOT EXISTS idx_visit_stops_location ON pricewaze_visit_stops USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_visit_stops_property_id ON pricewaze_visit_stops(property_id) WHERE property_id IS NOT NULL;

-- RLS Policies
ALTER TABLE pricewaze_visit_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_visit_stops ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view their own routes" ON pricewaze_visit_routes;
DROP POLICY IF EXISTS "Users can create their own routes" ON pricewaze_visit_routes;
DROP POLICY IF EXISTS "Users can update their own routes" ON pricewaze_visit_routes;
DROP POLICY IF EXISTS "Users can delete their own routes" ON pricewaze_visit_routes;
DROP POLICY IF EXISTS "Users can view stops from their routes" ON pricewaze_visit_stops;
DROP POLICY IF EXISTS "Users can create stops in their routes" ON pricewaze_visit_stops;
DROP POLICY IF EXISTS "Users can update stops in their routes" ON pricewaze_visit_stops;
DROP POLICY IF EXISTS "Users can delete stops from their routes" ON pricewaze_visit_stops;

-- Users can only see their own routes
CREATE POLICY "Users can view their own routes"
  ON pricewaze_visit_routes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own routes"
  ON pricewaze_visit_routes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routes"
  ON pricewaze_visit_routes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routes"
  ON pricewaze_visit_routes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Users can only see stops from their routes
CREATE POLICY "Users can view stops from their routes"
  ON pricewaze_visit_stops
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_visit_routes
      WHERE pricewaze_visit_routes.id = pricewaze_visit_stops.route_id
      AND pricewaze_visit_routes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create stops in their routes"
  ON pricewaze_visit_stops
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pricewaze_visit_routes
      WHERE pricewaze_visit_routes.id = pricewaze_visit_stops.route_id
      AND pricewaze_visit_routes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update stops in their routes"
  ON pricewaze_visit_stops
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_visit_routes
      WHERE pricewaze_visit_routes.id = pricewaze_visit_stops.route_id
      AND pricewaze_visit_routes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete stops from their routes"
  ON pricewaze_visit_stops
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_visit_routes
      WHERE pricewaze_visit_routes.id = pricewaze_visit_stops.route_id
      AND pricewaze_visit_routes.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_visit_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_visit_routes_updated_at ON pricewaze_visit_routes;

CREATE TRIGGER update_visit_routes_updated_at
  BEFORE UPDATE ON pricewaze_visit_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_visit_routes_updated_at();

