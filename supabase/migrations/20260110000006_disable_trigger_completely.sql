-- Disable the trigger completely to test if it's the problem
-- If user creation works after this, we know the trigger is the issue

-- Disable the trigger
ALTER TABLE auth.users DISABLE TRIGGER pricewaze_on_auth_user_created;

-- Verify it's disabled
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

-- Note: After disabling, test user creation
-- If it works, we'll need to either:
-- 1. Fix the trigger properly
-- 2. Create profiles manually after user creation
-- 3. Use a different approach (webhook, edge function, etc.)

