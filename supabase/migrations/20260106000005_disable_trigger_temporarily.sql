-- Temporarily disable trigger to test if it's causing the issue
-- If users can be created without the trigger, then we know the trigger is the problem

-- Disable the trigger temporarily
ALTER TABLE auth.users DISABLE TRIGGER pricewaze_on_auth_user_created;

-- Test: Try creating a user manually and see if it works
-- If it does, the trigger is the problem

