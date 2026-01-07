-- PriceWaze Comparisons Table
-- Allows users to compare up to 3 properties side by side

CREATE TABLE IF NOT EXISTS pricewaze_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_ids UUID[] NOT NULL CHECK (array_length(property_ids, 1) <= 3 AND array_length(property_ids, 1) > 0),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_comparisons_user_id ON pricewaze_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_property_ids ON pricewaze_comparisons USING GIN(property_ids);

-- RLS Policies
ALTER TABLE pricewaze_comparisons ENABLE ROW LEVEL SECURITY;

-- Users can only see their own comparisons
CREATE POLICY "Users can view their own comparisons"
  ON pricewaze_comparisons
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own comparisons
CREATE POLICY "Users can create their own comparisons"
  ON pricewaze_comparisons
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comparisons
CREATE POLICY "Users can update their own comparisons"
  ON pricewaze_comparisons
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comparisons
CREATE POLICY "Users can delete their own comparisons"
  ON pricewaze_comparisons
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comparisons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_comparisons_updated_at
  BEFORE UPDATE ON pricewaze_comparisons
  FOR EACH ROW
  EXECUTE FUNCTION update_comparisons_updated_at();

-- Add comment
COMMENT ON TABLE pricewaze_comparisons IS 'Stores property comparisons for users (max 3 properties per comparison)';


