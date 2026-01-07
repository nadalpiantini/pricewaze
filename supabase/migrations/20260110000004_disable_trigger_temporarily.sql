-- Temporarily disable the trigger to test if it's causing the issue
-- This will help us verify if the trigger is the problem

-- Disable the trigger (if we have permissions)
-- Note: This may fail if we don't have owner permissions on auth.users
DO $$
BEGIN
  -- Try to disable the trigger
  ALTER TABLE auth.users DISABLE TRIGGER pricewaze_on_auth_user_created;
  RAISE NOTICE 'Trigger disabled successfully';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cannot disable trigger - insufficient privileges. Trigger may need to be disabled by Supabase support.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error disabling trigger: %', SQLERRM;
END $$;

-- Verify trigger status
SELECT 
  tgname as trigger_name,
  CASE tgenabled 
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    WHEN 'R' THEN 'Replica'
    WHEN 'A' THEN 'Always'
    ELSE 'Unknown'
  END as status,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'pricewaze_on_auth_user_created';

