-- Fix user creation trigger to prevent blocking user creation
-- This migration creates a safe trigger that never blocks user creation
-- Note: We can only update the function, not create triggers on auth.users directly
-- The trigger should already exist from previous migrations

-- Step 1: Update the trigger function with maximum safety
-- This version will NEVER block user creation, even if profile creation fails
CREATE OR REPLACE FUNCTION pricewaze_handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try to create profile, but don't let any error block user creation
  BEGIN
    INSERT INTO pricewaze_profiles (id, email, full_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(SPLIT_PART(NEW.email, '@', 1), 'User')
      )
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Silently ignore ALL errors - user creation MUST succeed
      -- The profile can be created manually later if needed
      NULL;
  END;
  
  -- CRITICAL: Always return NEW to allow user creation to proceed
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Final safety net - even if something catastrophic happens
    -- we MUST return NEW to allow user creation
    RETURN NEW;
END;
$$;

-- Step 2: Verify trigger exists (we can't create it if we don't have permissions)
-- The trigger should already exist from previous migrations
-- If it doesn't exist, it will need to be created by Supabase support or via CLI
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'pricewaze_on_auth_user_created'
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    RAISE NOTICE 'Trigger pricewaze_on_auth_user_created does not exist. It may need to be created manually.';
  ELSE
    RAISE NOTICE 'Trigger pricewaze_on_auth_user_created exists and function has been updated.';
  END IF;
END $$;

-- Step 4: Ensure RLS policy allows trigger inserts
-- Drop conflicting policies first
DROP POLICY IF EXISTS "Users can insert own profile" ON pricewaze_profiles;
DROP POLICY IF EXISTS "Trigger can insert profiles" ON pricewaze_profiles;
DROP POLICY IF EXISTS "Allow profile inserts" ON pricewaze_profiles;

-- Create a comprehensive policy that allows trigger inserts
-- The trigger runs with SECURITY DEFINER, so it should bypass RLS
-- But we create this policy as a safety net
CREATE POLICY "Allow profile inserts" ON pricewaze_profiles 
  FOR INSERT 
  WITH CHECK (
    -- Allow if user is inserting their own profile
    auth.uid() = id
    OR
    -- Allow if the id exists in auth.users (for trigger context)
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = pricewaze_profiles.id
    )
  );

-- Step 5: Grant necessary permissions
-- The function runs as SECURITY DEFINER (postgres role), so it should have permissions
-- But we're being explicit here
GRANT USAGE ON SCHEMA public TO postgres;
GRANT INSERT ON pricewaze_profiles TO postgres;

COMMENT ON FUNCTION pricewaze_handle_new_user() IS 
'Creates a profile when a new user is created. Designed to NEVER block user creation even if profile creation fails. Uses SECURITY DEFINER to bypass RLS.';
