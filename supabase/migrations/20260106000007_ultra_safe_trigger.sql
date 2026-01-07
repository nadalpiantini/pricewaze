-- Ultra-safe trigger that will NEVER block user creation
-- This version catches ALL possible errors and always succeeds

CREATE OR REPLACE FUNCTION pricewaze_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Wrap everything in exception handling
  -- Even if profile creation fails completely, user creation must succeed
  BEGIN
    -- Try to insert profile
    -- Use ON CONFLICT to handle duplicates gracefully
    INSERT INTO pricewaze_profiles (id, email, full_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.email, 'User')
      )
    )
    ON CONFLICT (id) DO NOTHING;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Silently fail - don't even log to avoid any transaction issues
      -- User creation MUST succeed even if profile creation fails
      NULL;
  END;
  
  -- Always return NEW to allow user creation to proceed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was created
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'pricewaze_handle_new_user';

