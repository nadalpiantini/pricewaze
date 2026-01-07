-- FASE 2.3 + 2.4 + 3.1: Property follows and UI preferences
-- Tablas para seguir propiedades y guardar preferencias del mapa

-- ============================================================================
-- 1. PROPERTY FOLLOWS TABLE (Watchlist)
-- ============================================================================
-- Permite a usuarios seguir propiedades para recibir alertas
CREATE TABLE IF NOT EXISTS pricewaze_property_follows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_follows_property ON pricewaze_property_follows(property_id);
CREATE INDEX IF NOT EXISTS idx_property_follows_user ON pricewaze_property_follows(user_id);

-- ============================================================================
-- 2. USER UI PREFERENCES TABLE
-- ============================================================================
-- Guarda preferencias de UI del usuario (mapa, filtros, etc.)
CREATE TABLE IF NOT EXISTS pricewaze_user_ui_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  map_only_confirmed BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. RLS POLICIES (MVP - básicas)
-- ============================================================================
ALTER TABLE pricewaze_property_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_user_ui_prefs ENABLE ROW LEVEL SECURITY;

-- Property Follows: Users can view their own follows
DROP POLICY IF EXISTS "Users can view their own follows" ON pricewaze_property_follows;
CREATE POLICY "Users can view their own follows"
  ON pricewaze_property_follows
  FOR SELECT
  USING (auth.uid() = user_id);

-- Property Follows: Users can insert their own follows
DROP POLICY IF EXISTS "Users can insert their own follows" ON pricewaze_property_follows;
CREATE POLICY "Users can insert their own follows"
  ON pricewaze_property_follows
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Property Follows: Users can delete their own follows
DROP POLICY IF EXISTS "Users can delete their own follows" ON pricewaze_property_follows;
CREATE POLICY "Users can delete their own follows"
  ON pricewaze_property_follows
  FOR DELETE
  USING (auth.uid() = user_id);

-- UI Prefs: Users can view their own prefs
DROP POLICY IF EXISTS "Users can view their own prefs" ON pricewaze_user_ui_prefs;
CREATE POLICY "Users can view their own prefs"
  ON pricewaze_user_ui_prefs
  FOR SELECT
  USING (auth.uid() = user_id);

-- UI Prefs: Users can update their own prefs
DROP POLICY IF EXISTS "Users can update their own prefs" ON pricewaze_user_ui_prefs;
CREATE POLICY "Users can update their own prefs"
  ON pricewaze_user_ui_prefs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE pricewaze_property_follows IS 'Watchlist de propiedades que el usuario sigue para recibir alertas (FASE 3.1)';
COMMENT ON TABLE pricewaze_user_ui_prefs IS 'Preferencias de UI del usuario, incluyendo filtros del mapa (FASE 2.4)';

