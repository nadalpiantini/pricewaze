-- ============================================================================
-- DECISION PANELS V2 (Fairness Panel - Decision Intelligence)
-- ============================================================================
-- Tabla principal para snapshots de paneles de decisión por oferta
-- Cada panel es un snapshot del contexto de decisión en un momento específico
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricewaze_decision_panels (
  offer_id UUID PRIMARY KEY REFERENCES pricewaze_offers(id) ON DELETE CASCADE,

  -- Estados del panel
  price_position TEXT NOT NULL CHECK (price_position IN ('inside_range', 'outside_range')),
  uncertainty_level TEXT NOT NULL CHECK (uncertainty_level IN ('low', 'medium', 'high')),
  wait_risk_level TEXT NOT NULL CHECK (wait_risk_level IN ('low', 'medium', 'high')),
  market_velocity TEXT NOT NULL CHECK (market_velocity IN ('stable', 'accelerating', 'decelerating')),
  market_pressure TEXT NOT NULL CHECK (market_pressure IN ('low', 'medium', 'high')),

  -- Contenido del panel
  explanation_summary TEXT NOT NULL,  -- 1-2 sentences (copilot)
  option_act JSONB NOT NULL,          -- { pros: string[], cons: string[] }
  option_wait JSONB NOT NULL,          -- { pros: string[], cons: string[] }

  -- Personalización
  profile_applied TEXT CHECK (profile_applied IN ('buyer', 'investor', 'urgent', NULL)),
  model_version TEXT NOT NULL DEFAULT 'die-1.0',

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_decision_panels_offer_id ON pricewaze_decision_panels(offer_id);
CREATE INDEX IF NOT EXISTS idx_decision_panels_created_at ON pricewaze_decision_panels(created_at DESC);

-- RLS Policies
ALTER TABLE pricewaze_decision_panels ENABLE ROW LEVEL SECURITY;

-- Participants can view decision panels for their offers
CREATE POLICY "Participants can view decision panels"
  ON pricewaze_decision_panels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_offers o
      WHERE o.id = pricewaze_decision_panels.offer_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

-- Participants can insert/update decision panels for their offers
CREATE POLICY "Participants can manage decision panels"
  ON pricewaze_decision_panels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pricewaze_offers o
      WHERE o.id = pricewaze_decision_panels.offer_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "Participants can update decision panels"
  ON pricewaze_decision_panels
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_offers o
      WHERE o.id = pricewaze_decision_panels.offer_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pricewaze_offers o
      WHERE o.id = pricewaze_decision_panels.offer_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

-- Comentarios
COMMENT ON TABLE pricewaze_decision_panels IS 'Snapshots de paneles de decisión por oferta. Cada panel captura el contexto de decisión en un momento específico.';
COMMENT ON COLUMN pricewaze_decision_panels.price_position IS 'Posición del precio: inside_range (dentro del rango AVM ± presión) o outside_range';
COMMENT ON COLUMN pricewaze_decision_panels.uncertainty_level IS 'Nivel de incertidumbre: low (muchos comparables), medium (limitados), high (datos escasos)';
COMMENT ON COLUMN pricewaze_decision_panels.wait_risk_level IS 'Riesgo de esperar: low (baja presión + estable), medium (mixto), high (alta presión o aceleración)';
COMMENT ON COLUMN pricewaze_decision_panels.market_velocity IS 'Velocidad del mercado: stable (sin cambios), accelerating (actividad aumentando), decelerating (actividad disminuyendo)';
COMMENT ON COLUMN pricewaze_decision_panels.market_pressure IS 'Presión de mercado: low (pocas visitas), medium (visitas u ofertas), high (múltiples ofertas + señales confirmadas)';
COMMENT ON COLUMN pricewaze_decision_panels.explanation_summary IS 'Resumen ejecutivo de 1-2 oraciones generado por el copilot';
COMMENT ON COLUMN pricewaze_decision_panels.option_act IS 'JSON con pros y cons de actuar ahora: { pros: string[], cons: string[] }';
COMMENT ON COLUMN pricewaze_decision_panels.option_wait IS 'JSON con pros y cons de esperar: { pros: string[], cons: string[] }';
COMMENT ON COLUMN pricewaze_decision_panels.profile_applied IS 'Perfil aplicado para personalización: buyer, investor, urgent, o NULL (genérico)';
COMMENT ON COLUMN pricewaze_decision_panels.model_version IS 'Versión del modelo DIE usado para generar el panel';

