-- Final fix: Make trigger completely non-blocking
-- This version will NEVER fail user creation, even if profile creation fails

-- Re-enable trigger with ultra-safe version
ALTER TABLE auth.users ENABLE TRIGGER pricewaze_on_auth_user_created;

-- Create the safest possible trigger function
-- This version uses a separate transaction to ensure it never blocks user creation
CREATE OR REPLACE FUNCTION pricewaze_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  profile_created BOOLEAN := false;
BEGIN
  -- Try to create profile in a way that cannot fail the user creation
  -- Use a separate BEGIN/EXCEPTION block to catch ALL errors
  BEGIN
    -- Attempt insert
    INSERT INTO pricewaze_profiles (id, email, full_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        ''
      )
    )
    ON CONFLICT (id) DO NOTHING;
    
    profile_created := true;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but continue
      -- Use RAISE NOTICE instead of WARNING to avoid transaction issues
      RAISE NOTICE 'Could not create profile for user %: %', NEW.id, SQLERRM;
      profile_created := false;
  END;
  
  -- Always return NEW to allow user creation to succeed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify trigger is active
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'pricewaze_on_auth_user_created' 
    AND tgenabled = 'O'
  ) THEN
    RAISE NOTICE 'Trigger may not be enabled correctly';
  END IF;
END $$;

