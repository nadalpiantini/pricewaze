-- Gamification System
-- Trust Score, Badges, Achievements, and Points System

-- Add trust_score to profiles
ALTER TABLE pricewaze_profiles 
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100);

ALTER TABLE pricewaze_profiles 
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0 CHECK (total_points >= 0);

ALTER TABLE pricewaze_profiles 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 CHECK (level >= 1);

-- Badges definition table
CREATE TABLE IF NOT EXISTS pricewaze_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- 'first_visit', 'first_offer', 'power_negotiator', etc.
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Lucide icon name
  color TEXT NOT NULL, -- 'blue', 'green', 'gold', etc.
  category TEXT NOT NULL, -- 'onboarding', 'engagement', 'expertise', 'social'
  points_reward INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Achievements definition table
CREATE TABLE IF NOT EXISTS pricewaze_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- 'verified_explorer', 'deal_maker', 'market_analyst', etc.
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  category TEXT NOT NULL,
  requirement_type TEXT NOT NULL, -- 'count', 'streak', 'value', 'combo'
  requirement_value INTEGER NOT NULL, -- e.g., 10 visits, 5 offers, etc.
  points_reward INTEGER DEFAULT 0,
  badge_reward_id UUID REFERENCES pricewaze_badges(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User badges (badges earned by users)
CREATE TABLE IF NOT EXISTS pricewaze_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES pricewaze_profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES pricewaze_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- User achievements (achievements completed by users)
CREATE TABLE IF NOT EXISTS pricewaze_user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES pricewaze_profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES pricewaze_achievements(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0, -- Current progress toward requirement
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, achievement_id)
);

-- Points history (audit trail of all points earned)
CREATE TABLE IF NOT EXISTS pricewaze_points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES pricewaze_profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  source TEXT NOT NULL, -- 'badge', 'achievement', 'action', 'bonus'
  source_id UUID, -- ID of badge/achievement/action that granted points
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON pricewaze_user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON pricewaze_user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON pricewaze_user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON pricewaze_user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON pricewaze_points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_points_history_created_at ON pricewaze_points_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_badges_code ON pricewaze_badges(code);
CREATE INDEX IF NOT EXISTS idx_achievements_code ON pricewaze_achievements(code);

-- RLS Policies
ALTER TABLE pricewaze_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_points_history ENABLE ROW LEVEL SECURITY;

-- Badges: Public read
DROP POLICY IF EXISTS "Anyone can view badges" ON pricewaze_badges;
CREATE POLICY "Anyone can view badges"
  ON pricewaze_badges FOR SELECT
  USING (true);

-- Achievements: Public read
DROP POLICY IF EXISTS "Anyone can view achievements" ON pricewaze_achievements;
CREATE POLICY "Anyone can view achievements"
  ON pricewaze_achievements FOR SELECT
  USING (true);

-- User badges: Users see their own
DROP POLICY IF EXISTS "Users can view their own badges" ON pricewaze_user_badges;
CREATE POLICY "Users can view their own badges"
  ON pricewaze_user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- User achievements: Users see their own
DROP POLICY IF EXISTS "Users can view their own achievements" ON pricewaze_user_achievements;
CREATE POLICY "Users can view their own achievements"
  ON pricewaze_user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Points history: Users see their own
DROP POLICY IF EXISTS "Users can view their own points history" ON pricewaze_points_history;
CREATE POLICY "Users can view their own points history"
  ON pricewaze_points_history FOR SELECT
  USING (auth.uid() = user_id);

-- Function to award points and update user total
CREATE OR REPLACE FUNCTION pricewaze_award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_source TEXT,
  p_source_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT ''
)
RETURNS void AS $$
BEGIN
  -- Insert points history
  INSERT INTO pricewaze_points_history (
    user_id,
    points,
    source,
    source_id,
    description
  ) VALUES (
    p_user_id,
    p_points,
    p_source,
    p_source_id,
    p_description
  );

  -- Update user total points
  UPDATE pricewaze_profiles
  SET total_points = total_points + p_points
  WHERE id = p_user_id;

  -- Update level based on total points (after adding new points)
  -- Level formula: sqrt(points) / 10, minimum level 1
  UPDATE pricewaze_profiles
  SET level = GREATEST(1, FLOOR(SQRT(total_points) / 10) + 1)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award badge
CREATE OR REPLACE FUNCTION pricewaze_award_badge(
  p_user_id UUID,
  p_badge_code TEXT
)
RETURNS UUID AS $$
DECLARE
  v_badge_id UUID;
  v_badge_points INTEGER;
BEGIN
  -- Get badge
  SELECT id, points_reward INTO v_badge_id, v_badge_points
  FROM pricewaze_badges
  WHERE code = p_badge_code;

  IF v_badge_id IS NULL THEN
    RAISE EXCEPTION 'Badge not found: %', p_badge_code;
  END IF;

  -- Check if badge already exists
  IF NOT EXISTS (SELECT 1 FROM pricewaze_user_badges WHERE user_id = p_user_id AND badge_id = v_badge_id) THEN
    -- Award badge
    INSERT INTO pricewaze_user_badges (user_id, badge_id)
    VALUES (p_user_id, v_badge_id);

    -- Award points if badge has points reward
    IF v_badge_points > 0 THEN
      PERFORM pricewaze_award_points(
        p_user_id,
        v_badge_points,
        'badge',
        v_badge_id,
        'Badge reward: ' || (SELECT name FROM pricewaze_badges WHERE id = v_badge_id)
      );
    END IF;
  END IF;

  RETURN v_badge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update achievement progress
CREATE OR REPLACE FUNCTION pricewaze_update_achievement(
  p_user_id UUID,
  p_achievement_code TEXT,
  p_progress_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_achievement_id UUID;
  v_requirement_value INTEGER;
  v_current_progress INTEGER;
  v_completed BOOLEAN := false;
  v_points_reward INTEGER;
  v_badge_reward_id UUID;
BEGIN
  -- Get achievement
  SELECT id, requirement_value, points_reward, badge_reward_id
  INTO v_achievement_id, v_requirement_value, v_points_reward, v_badge_reward_id
  FROM pricewaze_achievements
  WHERE code = p_achievement_code;

  IF v_achievement_id IS NULL THEN
    RAISE EXCEPTION 'Achievement not found: %', p_achievement_code;
  END IF;

  -- Get or create user achievement
  INSERT INTO pricewaze_user_achievements (user_id, achievement_id, progress)
  VALUES (p_user_id, v_achievement_id, p_progress_increment)
  ON CONFLICT (user_id, achievement_id)
  DO UPDATE SET progress = pricewaze_user_achievements.progress + p_progress_increment
  RETURNING progress INTO v_current_progress;

  -- Check if completed
  IF v_current_progress >= v_requirement_value AND v_current_progress - p_progress_increment < v_requirement_value THEN
    -- Just completed!
    UPDATE pricewaze_user_achievements
    SET completed_at = now()
    WHERE user_id = p_user_id AND achievement_id = v_achievement_id;

    v_completed := true;

    -- Award points
    IF v_points_reward > 0 THEN
      PERFORM pricewaze_award_points(
        p_user_id,
        v_points_reward,
        'achievement',
        v_achievement_id,
        'Achievement completed: ' || (SELECT name FROM pricewaze_achievements WHERE id = v_achievement_id)
      );
    END IF;

    -- Award badge if achievement grants one
    IF v_badge_reward_id IS NOT NULL THEN
      PERFORM pricewaze_award_badge(
        p_user_id,
        (SELECT code FROM pricewaze_badges WHERE id = v_badge_reward_id)
      );
    END IF;
  END IF;

  RETURN v_completed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate trust score
CREATE OR REPLACE FUNCTION pricewaze_calculate_trust_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_verified_visits INTEGER;
  v_completed_offers INTEGER;
  v_signed_agreements INTEGER;
  v_account_age_days INTEGER;
  v_badges_count INTEGER;
BEGIN
  -- Base score from account age (max 20 points)
  SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 INTO v_account_age_days
  FROM pricewaze_profiles WHERE id = p_user_id;
  
  v_score := v_score + LEAST(20, FLOOR(v_account_age_days / 30));

  -- Verified visits (max 30 points)
  SELECT COUNT(*) INTO v_verified_visits
  FROM pricewaze_visits
  WHERE visitor_id = p_user_id AND verified_at IS NOT NULL;
  
  v_score := v_score + LEAST(30, v_verified_visits * 3);

  -- Completed offers (max 25 points)
  SELECT COUNT(*) INTO v_completed_offers
  FROM pricewaze_offers
  WHERE buyer_id = p_user_id AND status = 'accepted';
  
  v_score := v_score + LEAST(25, v_completed_offers * 5);

  -- Signed agreements (max 15 points)
  SELECT COUNT(*) INTO v_signed_agreements
  FROM pricewaze_agreements
  WHERE (buyer_id = p_user_id OR seller_id = p_user_id)
    AND (signed_by_buyer = true OR signed_by_seller = true);
  
  v_score := v_score + LEAST(15, v_signed_agreements * 15);

  -- Badges (max 10 points)
  SELECT COUNT(*) INTO v_badges_count
  FROM pricewaze_user_badges
  WHERE user_id = p_user_id;
  
  v_score := v_score + LEAST(10, v_badges_count * 2);

  RETURN LEAST(100, v_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update trust score periodically (can be called via cron or API)
-- For now, we'll update it manually via API calls

-- Seed initial badges
INSERT INTO pricewaze_badges (code, name, description, icon, color, category, points_reward) VALUES
  ('welcome', 'Welcome!', 'Completed onboarding', 'Sparkles', 'blue', 'onboarding', 10),
  ('first_visit', 'First Visit', 'Completed your first verified property visit', 'MapPin', 'green', 'engagement', 20),
  ('first_offer', 'First Offer', 'Made your first property offer', 'Handshake', 'blue', 'engagement', 25),
  ('power_negotiator', 'Power Negotiator', 'Completed 5 successful negotiations', 'TrendingUp', 'purple', 'expertise', 50),
  ('market_analyst', 'Market Analyst', 'Analyzed 10 properties', 'BarChart', 'gold', 'expertise', 40),
  ('verified_explorer', 'Verified Explorer', 'Completed 10 verified visits', 'Compass', 'green', 'engagement', 60),
  ('deal_maker', 'Deal Maker', 'Signed your first agreement', 'FileCheck', 'gold', 'expertise', 75),
  ('trusted_member', 'Trusted Member', 'Reached trust score of 80+', 'Shield', 'purple', 'social', 100)
ON CONFLICT DO NOTHING;

-- Seed initial achievements
INSERT INTO pricewaze_achievements (code, name, description, icon, color, category, requirement_type, requirement_value, points_reward, badge_reward_id) VALUES
  ('verified_explorer', 'Verified Explorer', 'Complete 10 verified property visits', 'Compass', 'green', 'engagement', 'count', 10, 100, (SELECT id FROM pricewaze_badges WHERE code = 'verified_explorer')),
  ('deal_maker', 'Deal Maker', 'Sign 3 property agreements', 'FileCheck', 'gold', 'expertise', 'count', 3, 200, (SELECT id FROM pricewaze_badges WHERE code = 'deal_maker')),
  ('market_analyst', 'Market Analyst', 'Analyze 20 properties', 'BarChart', 'blue', 'expertise', 'count', 20, 150, (SELECT id FROM pricewaze_badges WHERE code = 'market_analyst')),
  ('power_negotiator', 'Power Negotiator', 'Complete 10 successful negotiations', 'TrendingUp', 'purple', 'expertise', 'count', 10, 250, (SELECT id FROM pricewaze_badges WHERE code = 'power_negotiator')),
  ('early_adopter', 'Early Adopter', 'Join in the first month', 'Star', 'gold', 'social', 'count', 1, 50, NULL),
  ('trust_builder', 'Trust Builder', 'Reach trust score of 50', 'Shield', 'blue', 'social', 'value', 50, 75, NULL),
  ('trust_master', 'Trust Master', 'Reach trust score of 90', 'Award', 'purple', 'social', 'value', 90, 200, (SELECT id FROM pricewaze_badges WHERE code = 'trusted_member'))
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE pricewaze_badges IS 'Badge definitions that can be earned by users';
COMMENT ON TABLE pricewaze_achievements IS 'Achievement definitions with progress tracking';
COMMENT ON TABLE pricewaze_user_badges IS 'Badges earned by users';
COMMENT ON TABLE pricewaze_user_achievements IS 'Achievement progress and completion for users';
COMMENT ON TABLE pricewaze_points_history IS 'Audit trail of all points earned by users';
COMMENT ON FUNCTION pricewaze_award_points IS 'Awards points to a user and updates their total';
COMMENT ON FUNCTION pricewaze_award_badge IS 'Awards a badge to a user if not already earned';
COMMENT ON FUNCTION pricewaze_update_achievement IS 'Updates achievement progress and awards completion rewards';
COMMENT ON FUNCTION pricewaze_calculate_trust_score IS 'Calculates trust score based on user activity';

