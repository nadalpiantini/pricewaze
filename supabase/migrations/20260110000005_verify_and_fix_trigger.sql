-- Verify and fix trigger function
-- This will check the current function and ensure it's safe

-- Step 1: Check current function code
SELECT 
  proname,
  prosrc
FROM pg_proc 
WHERE proname = 'pricewaze_handle_new_user';

-- Step 2: Update function to be absolutely safe
-- This version does NOTHING except return NEW
-- This will help us verify if the function itself is the problem
CREATE OR REPLACE FUNCTION pricewaze_handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Do absolutely nothing - just return NEW
  -- This is a test to see if even an empty function works
  RETURN NEW;
END;
$$;

-- Step 3: Verify the function was updated
SELECT 
  proname,
  LEFT(prosrc, 200) as function_preview
FROM pg_proc 
WHERE proname = 'pricewaze_handle_new_user';

-- Note: After this, test user creation
-- If it still fails, the problem is not the function but something else

