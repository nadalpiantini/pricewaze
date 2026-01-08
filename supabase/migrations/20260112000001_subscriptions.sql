-- Soft Launch: Subscriptions System (L4)
-- Tabla de suscripciones Pro con trial de 7 días gratis

-- ============================================================================
-- 1. SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'pro_trial')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  trial_ends_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id) -- One subscription per user
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON pricewaze_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON pricewaze_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends ON pricewaze_subscriptions(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- ============================================================================
-- 2. RLS POLICIES
-- ============================================================================
ALTER TABLE pricewaze_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
DROP POLICY IF EXISTS "Users can view their own subscription" ON pricewaze_subscriptions;
CREATE POLICY "Users can view their own subscription"
  ON pricewaze_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own subscription (for trial activation)
DROP POLICY IF EXISTS "Users can insert their own subscription" ON pricewaze_subscriptions;
CREATE POLICY "Users can insert their own subscription"
  ON pricewaze_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription (for cancellation)
DROP POLICY IF EXISTS "Users can update their own subscription" ON pricewaze_subscriptions;
CREATE POLICY "Users can update their own subscription"
  ON pricewaze_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. FUNCTION: Check if user has Pro access
-- ============================================================================
CREATE OR REPLACE FUNCTION pricewaze_has_pro_access(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub_record RECORD;
BEGIN
  SELECT * INTO sub_record
  FROM pricewaze_subscriptions
  WHERE user_id = user_id_param
  LIMIT 1;

  -- If no subscription, user is on free plan
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if subscription is active and not expired
  IF sub_record.status = 'cancelled' OR sub_record.status = 'expired' THEN
    RETURN false;
  END IF;

  -- Check if trial is still valid
  IF sub_record.plan = 'pro_trial' AND sub_record.trial_ends_at IS NOT NULL THEN
    IF sub_record.trial_ends_at < now() THEN
      -- Trial expired, update status
      UPDATE pricewaze_subscriptions
      SET status = 'expired', updated_at = now()
      WHERE id = sub_record.id;
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  -- Check if Pro subscription is active
  IF sub_record.plan = 'pro' AND sub_record.status = 'active' THEN
    -- Check expiration if set
    IF sub_record.expires_at IS NOT NULL AND sub_record.expires_at < now() THEN
      UPDATE pricewaze_subscriptions
      SET status = 'expired', updated_at = now()
      WHERE id = sub_record.id;
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. FUNCTION: Activate Pro Trial (7 days)
-- ============================================================================
CREATE OR REPLACE FUNCTION pricewaze_activate_pro_trial(user_id_param UUID)
RETURNS pricewaze_subscriptions AS $$
DECLARE
  existing_sub RECORD;
  new_sub pricewaze_subscriptions;
  trial_end_date TIMESTAMPTZ;
BEGIN
  -- Calculate trial end date (7 days from now)
  trial_end_date := now() + INTERVAL '7 days';

  -- Check if user already has a subscription
  SELECT * INTO existing_sub
  FROM pricewaze_subscriptions
  WHERE user_id = user_id_param
  LIMIT 1;

  IF FOUND THEN
    -- Update existing subscription
    UPDATE pricewaze_subscriptions
    SET
      plan = 'pro_trial',
      status = 'trial',
      trial_ends_at = trial_end_date,
      updated_at = now()
    WHERE user_id = user_id_param
    RETURNING * INTO new_sub;
  ELSE
    -- Create new subscription
    INSERT INTO pricewaze_subscriptions (
      user_id,
      plan,
      status,
      trial_ends_at
    )
    VALUES (
      user_id_param,
      'pro_trial',
      'trial',
      trial_end_date
    )
    RETURNING * INTO new_sub;
  END IF;

  RETURN new_sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE pricewaze_subscriptions IS 'Suscripciones Pro con trial de 7 días gratis (Soft Launch L4)';
COMMENT ON FUNCTION pricewaze_has_pro_access IS 'Verifica si un usuario tiene acceso Pro (trial o pagado)';
COMMENT ON FUNCTION pricewaze_activate_pro_trial IS 'Activa trial Pro de 7 días gratis para un usuario';

