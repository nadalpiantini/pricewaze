-- PriceWaze Reviews and Ratings System
-- Allows users to review properties and rate agents

-- Property Reviews Table
CREATE TABLE IF NOT EXISTS pricewaze_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  verified_visit BOOLEAN DEFAULT false, -- Only true if user has GPS-verified visit
  visit_id UUID REFERENCES pricewaze_visits(id),
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, user_id) -- One review per user per property
);

-- Agent Ratings Table
CREATE TABLE IF NOT EXISTS pricewaze_agent_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES pricewaze_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, user_id) -- One rating per user per agent
);

-- Review Helpful Votes (users can mark reviews as helpful)
CREATE TABLE IF NOT EXISTS pricewaze_review_helpful (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES pricewaze_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id) -- One vote per user per review
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_property_id ON pricewaze_reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON pricewaze_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON pricewaze_reviews(property_id, rating);
CREATE INDEX IF NOT EXISTS idx_agent_ratings_agent_id ON pricewaze_agent_ratings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_ratings_user_id ON pricewaze_agent_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_review_id ON pricewaze_review_helpful(review_id);

-- RLS Policies
ALTER TABLE pricewaze_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_agent_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_review_helpful ENABLE ROW LEVEL SECURITY;

-- Reviews Policies
CREATE POLICY "Anyone can view property reviews"
  ON pricewaze_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own reviews"
  ON pricewaze_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON pricewaze_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON pricewaze_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Agent Ratings Policies
CREATE POLICY "Anyone can view agent ratings"
  ON pricewaze_agent_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own agent ratings"
  ON pricewaze_agent_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent ratings"
  ON pricewaze_agent_ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent ratings"
  ON pricewaze_agent_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Review Helpful Policies
CREATE POLICY "Anyone can view helpful votes"
  ON pricewaze_review_helpful FOR SELECT
  USING (true);

CREATE POLICY "Users can vote on reviews"
  ON pricewaze_review_helpful FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their votes"
  ON pricewaze_review_helpful FOR DELETE
  USING (auth.uid() = user_id);

-- Function to calculate property rating average
CREATE OR REPLACE FUNCTION calculate_property_rating(property_uuid UUID)
RETURNS TABLE (avg_rating NUMERIC, total_reviews INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating)::NUMERIC, 2) as avg_rating,
    COUNT(*)::INTEGER as total_reviews
  FROM pricewaze_reviews
  WHERE property_id = property_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate agent rating average
CREATE OR REPLACE FUNCTION calculate_agent_rating(agent_uuid UUID)
RETURNS TABLE (avg_rating NUMERIC, total_ratings INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating)::NUMERIC, 2) as avg_rating,
    COUNT(*)::INTEGER as total_ratings
  FROM pricewaze_agent_ratings
  WHERE agent_id = agent_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to update helpful_count when votes change
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE pricewaze_reviews
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pricewaze_reviews
    SET helpful_count = GREATEST(0, helpful_count - 1)
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for helpful_count
CREATE TRIGGER update_review_helpful_count
  AFTER INSERT OR DELETE ON pricewaze_review_helpful
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON pricewaze_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

CREATE TRIGGER update_agent_ratings_updated_at
  BEFORE UPDATE ON pricewaze_agent_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Comments
COMMENT ON TABLE pricewaze_reviews IS 'User reviews for properties';
COMMENT ON TABLE pricewaze_agent_ratings IS 'User ratings for agents';
COMMENT ON TABLE pricewaze_review_helpful IS 'Tracks helpful votes on reviews';

