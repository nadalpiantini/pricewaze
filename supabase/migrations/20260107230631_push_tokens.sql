-- W3 PUSH NOTIFICATIONS
-- Table for storing push notification tokens

-- ============================================================================
-- PUSH TOKENS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token) -- One token per user per device
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON pricewaze_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON pricewaze_push_tokens(platform);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE pricewaze_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
DROP POLICY IF EXISTS "Users can view their own push tokens" ON pricewaze_push_tokens;
CREATE POLICY "Users can view their own push tokens"
  ON pricewaze_push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tokens
DROP POLICY IF EXISTS "Users can insert their own push tokens" ON pricewaze_push_tokens;
CREATE POLICY "Users can insert their own push tokens"
  ON pricewaze_push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
DROP POLICY IF EXISTS "Users can update their own push tokens" ON pricewaze_push_tokens;
CREATE POLICY "Users can update their own push tokens"
  ON pricewaze_push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tokens
DROP POLICY IF EXISTS "Users can delete their own push tokens" ON pricewaze_push_tokens;
CREATE POLICY "Users can delete their own push tokens"
  ON pricewaze_push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

