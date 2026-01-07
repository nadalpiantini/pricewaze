-- Fix profile creation trigger to work with RLS
-- The trigger needs to be able to insert profiles even when RLS is enabled

-- Add a policy that allows the trigger function to insert profiles
-- SECURITY DEFINER functions run with elevated privileges, but RLS still applies
-- This policy allows the trigger to insert profiles for newly created users
-- Note: The trigger validates that id matches NEW.id from auth.users
CREATE POLICY "Trigger can insert profiles" ON pricewaze_profiles 
  FOR INSERT 
  WITH CHECK (
    -- Allow if the id exists in auth.users (trigger context)
    EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = pricewaze_profiles.id)
  );

-- Also ensure the trigger function can handle errors gracefully
CREATE OR REPLACE FUNCTION pricewaze_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert profile, ignore if it already exists
  INSERT INTO pricewaze_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

