-- Fix RLS policy for price_history table
-- The trigger that creates price history needs INSERT permission

-- Add INSERT policy for price history (trigger needs this)
CREATE POLICY "Trigger can insert price history" ON pricewaze_property_price_history 
  FOR INSERT 
  WITH CHECK (true); -- Trigger manages this, so allow all inserts

