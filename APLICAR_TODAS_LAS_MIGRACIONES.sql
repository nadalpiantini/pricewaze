-- ============================================================================
-- APLICAR TODAS LAS MIGRACIONES - PRICEWAZE
-- ============================================================================
-- Copia y pega TODO este contenido en Supabase Dashboard > SQL Editor
-- Ejecuta todo de una vez (Cmd+Enter / Ctrl+Enter)
-- ============================================================================

-- ============================================================================
-- MIGRACIÓN 1: Fix Profile Trigger (20260106000002)
-- ============================================================================

DROP POLICY IF EXISTS "Trigger can insert profiles" ON pricewaze_profiles;

CREATE POLICY "Trigger can insert profiles" ON pricewaze_profiles 
  FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = pricewaze_profiles.id)
  );

CREATE OR REPLACE FUNCTION pricewaze_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRACIÓN 2: Fix RLS Policies (20260106000004)
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON pricewaze_profiles;
DROP POLICY IF EXISTS "Trigger can insert profiles" ON pricewaze_profiles;
DROP POLICY IF EXISTS "Allow profile inserts" ON pricewaze_profiles;

CREATE POLICY "Allow profile inserts" ON pricewaze_profiles 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = id
    OR
    EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = pricewaze_profiles.id)
  );

-- ============================================================================
-- MIGRACIÓN 3: Ultra-Safe Trigger (20260106000007)
-- ============================================================================

CREATE OR REPLACE FUNCTION pricewaze_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
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
      NULL; -- Silently fail, never block
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRACIÓN 4: Fix Price History RLS (20260106000008)
-- ============================================================================

DROP POLICY IF EXISTS "Trigger can insert price history" ON pricewaze_property_price_history;

CREATE POLICY "Trigger can insert price history" ON pricewaze_property_price_history 
  FOR INSERT 
  WITH CHECK (true);

-- ============================================================================
-- MIGRACIÓN 5: Fix Favorites RLS (20260106000009)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own favorites" ON pricewaze_favorites;
DROP POLICY IF EXISTS "Users can create own favorites" ON pricewaze_favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON pricewaze_favorites;

CREATE POLICY "Users can view own favorites" ON pricewaze_favorites
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites" ON pricewaze_favorites
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON pricewaze_favorites
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las funciones existen
SELECT proname FROM pg_proc WHERE proname = 'pricewaze_handle_new_user';

-- Verificar políticas
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('pricewaze_profiles', 'pricewaze_property_price_history')
ORDER BY tablename, policyname;

