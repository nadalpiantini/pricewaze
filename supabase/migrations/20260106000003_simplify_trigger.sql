-- Simplify trigger to avoid errors
-- This version is more defensive and should not fail user creation

-- First, let's make the trigger function even more robust
CREATE OR REPLACE FUNCTION pricewaze_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Use a transaction-safe approach
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
      -- Log but don't fail - user creation should succeed even if profile fails
      RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the trigger exists and is active
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'pricewaze_on_auth_user_created'
  ) THEN
    CREATE TRIGGER pricewaze_on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION pricewaze_handle_new_user();
  END IF;
END $$;

