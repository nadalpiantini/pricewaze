-- Fix RLS policies to allow trigger to work
-- The issue is that multiple INSERT policies may conflict

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "Users can insert own profile" ON pricewaze_profiles;
DROP POLICY IF EXISTS "Trigger can insert profiles" ON pricewaze_profiles;
DROP POLICY IF EXISTS "Allow profile inserts" ON pricewaze_profiles;

-- Create a single policy that allows both user inserts and trigger inserts
-- This policy allows:
-- 1. Users to insert their own profile (auth.uid() = id)
-- 2. Trigger to insert profiles for new users (id exists in auth.users)
CREATE POLICY "Allow profile inserts" ON pricewaze_profiles 
  FOR INSERT 
  WITH CHECK (
    -- Allow if user is inserting their own profile
    auth.uid() = id
    OR
    -- Allow if the id exists in auth.users (trigger context)
    EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = pricewaze_profiles.id)
  );

-- Ensure the trigger function is robust
CREATE OR REPLACE FUNCTION pricewaze_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Use SET LOCAL to temporarily bypass RLS if needed
  -- But first try normal insert
  BEGIN
    INSERT INTO pricewaze_profiles (id, email, full_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        ''
      )
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- If RLS blocks, try with elevated privileges
      -- SECURITY DEFINER should already have this, but let's be explicit
      PERFORM set_config('request.jwt.claim.role', 'service_role', true);
      INSERT INTO pricewaze_profiles (id, email, full_name)
      VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(
          NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'name',
          ''
        )
      )
      ON CONFLICT (id) DO NOTHING;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Last resort: log but don't fail user creation
    RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

