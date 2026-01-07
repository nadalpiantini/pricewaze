-- PriceWaze Property Media System
-- Enhanced gallery with categories and virtual tours

-- Property Media Table
CREATE TABLE IF NOT EXISTS pricewaze_property_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL, -- 'image', 'video_360', 'virtual_tour', 'video'
  category TEXT, -- 'exterior', 'interior', 'floor_plan', 'amenities', 'other'
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  order_index INTEGER DEFAULT 0,
  metadata JSONB, -- {duration, resolution, tour_config, etc}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_media_property_id ON pricewaze_property_media(property_id);
CREATE INDEX IF NOT EXISTS idx_property_media_category ON pricewaze_property_media(property_id, category);
CREATE INDEX IF NOT EXISTS idx_property_media_order ON pricewaze_property_media(property_id, order_index);

-- RLS Policies
ALTER TABLE pricewaze_property_media ENABLE ROW LEVEL SECURITY;

-- Anyone can view property media
CREATE POLICY "Anyone can view property media"
  ON pricewaze_property_media FOR SELECT
  USING (true);

-- Property owners can manage their media
CREATE POLICY "Property owners can create media"
  ON pricewaze_property_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pricewaze_properties
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can update their media"
  ON pricewaze_property_media FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_properties
      WHERE id = property_id AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pricewaze_properties
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can delete their media"
  ON pricewaze_property_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_properties
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_property_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER update_property_media_updated_at
  BEFORE UPDATE ON pricewaze_property_media
  FOR EACH ROW
  EXECUTE FUNCTION update_property_media_updated_at();

-- Comments
COMMENT ON TABLE pricewaze_property_media IS 'Enhanced media gallery for properties with categories and virtual tours';

