-- Free Pro Access for @nadalpiantini.com domain (Soft Launch)
-- All users with @nadalpiantini.com email get Pro access for free

-- ============================================================================
-- 1. FUNCTION: Grant Pro access to @nadalpiantini.com users
-- ============================================================================
CREATE OR REPLACE FUNCTION pricewaze_grant_free_pro_to_nadalpiantini()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find all users with @nadalpiantini.com email
  FOR user_record IN
    SELECT id, email
    FROM auth.users
    WHERE email LIKE '%@nadalpiantini.com'
  LOOP
    -- Insert or update subscription to Pro (no expiration)
    INSERT INTO pricewaze_subscriptions (
      user_id,
      plan,
      status,
      expires_at
    )
    VALUES (
      user_record.id,
      'pro',
      'active',
      NULL -- No expiration = lifetime free
    )
    ON CONFLICT (user_id) DO UPDATE SET
      plan = 'pro',
      status = 'active',
      expires_at = NULL,
      trial_ends_at = NULL,
      updated_at = now();
    
    RAISE NOTICE 'Granted free Pro access to: % (ID: %)', user_record.email, user_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. UPDATE pricewaze_has_pro_access to check @nadalpiantini.com domain
-- ============================================================================
CREATE OR REPLACE FUNCTION pricewaze_has_pro_access(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub_record RECORD;
  user_email TEXT;
BEGIN
  -- First check: If user has @nadalpiantini.com email, always grant Pro access
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id_param;
  
  IF user_email LIKE '%@nadalpiantini.com' THEN
    -- Ensure subscription exists for this user
    INSERT INTO pricewaze_subscriptions (
      user_id,
      plan,
      status,
      expires_at
    )
    VALUES (
      user_id_param,
      'pro',
      'active',
      NULL
    )
    ON CONFLICT (user_id) DO UPDATE SET
      plan = 'pro',
      status = 'active',
      expires_at = NULL,
      updated_at = now();
    
    RETURN true;
  END IF;

  -- Second check: Normal subscription check
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
-- 3. Grant Pro access to existing @nadalpiantini.com users
-- ============================================================================
SELECT pricewaze_grant_free_pro_to_nadalpiantini();

-- ============================================================================
-- 4. TRIGGER: Auto-grant Pro to new @nadalpiantini.com users
-- ============================================================================
CREATE OR REPLACE FUNCTION pricewaze_auto_grant_pro_to_nadalpiantini()
RETURNS TRIGGER AS $$
BEGIN
  -- If new user has @nadalpiantini.com email, grant Pro access
  IF NEW.email LIKE '%@nadalpiantini.com' THEN
    INSERT INTO pricewaze_subscriptions (
      user_id,
      plan,
      status,
      expires_at
    )
    VALUES (
      NEW.id,
      'pro',
      'active',
      NULL -- No expiration = lifetime free
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users (if we have permissions)
-- Note: This might need to be created via Supabase dashboard or CLI
DO $$
BEGIN
  -- Try to create trigger, but don't fail if we don't have permissions
  BEGIN
    DROP TRIGGER IF EXISTS pricewaze_auto_grant_pro_trigger ON auth.users;
    CREATE TRIGGER pricewaze_auto_grant_pro_trigger
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION pricewaze_auto_grant_pro_to_nadalpiantini();
    
    RAISE NOTICE 'Trigger created successfully';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Cannot create trigger on auth.users (insufficient privileges). Trigger must be created manually via Supabase dashboard.';
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not create trigger: %', SQLERRM;
  END;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION pricewaze_grant_free_pro_to_nadalpiantini IS 'Grants free Pro access to all existing @nadalpiantini.com users';
COMMENT ON FUNCTION pricewaze_has_pro_access IS 'Checks Pro access, including free access for @nadalpiantini.com domain';
COMMENT ON FUNCTION pricewaze_auto_grant_pro_to_nadalpiantini IS 'Auto-grants Pro access to new users with @nadalpiantini.com email';

