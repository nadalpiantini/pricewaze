-- Fix RLS policy for favorites table
-- The USING expression is blocking inserts

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own favorites" ON pricewaze_favorites;
DROP POLICY IF EXISTS "Users can create own favorites" ON pricewaze_favorites;

-- Recreate with correct USING expression
CREATE POLICY "Users can view own favorites" ON pricewaze_favorites
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites" ON pricewaze_favorites
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON pricewaze_favorites
  FOR DELETE 
  USING (auth.uid() = user_id);

