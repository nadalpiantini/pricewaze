-- ============================================================================
-- DECISION INTELLIGENCE ENGINE
-- Sistema de inteligencia de decisión que va más allá del pricing simple
-- Modela incertidumbre, velocidad de mercado, riesgo de espera y fairness multi-dimensional
-- ============================================================================

-- ============================================================================
-- 1. AVM RESULTS (Automated Valuation Model Results)
-- ============================================================================
-- Almacena resultados de modelos AVM con rangos de confianza y factores explicables
CREATE TABLE IF NOT EXISTS pricewaze_avm_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  model_version TEXT NOT NULL DEFAULT 'v1.0',
  
  -- Estimaciones
  estimate DECIMAL(15,2) NOT NULL,
  low_estimate DECIMAL(15,2) NOT NULL,
  high_estimate DECIMAL(15,2) NOT NULL,
  
  -- Métricas de confianza
  confidence NUMERIC(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  uncertainty_level TEXT NOT NULL CHECK (uncertainty_level IN ('low', 'medium', 'high')),
  
  -- Factores explicables (SHAP-like)
  top_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Ejemplo: {"location": 0.12, "size": 0.08, "age": -0.05, "noise": -0.03}
  
  -- Metadatos
  comparable_count INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- Para invalidar resultados antiguos
  
  -- Índices
  CONSTRAINT pricewaze_avm_results_property_id_fkey FOREIGN KEY (property_id) 
    REFERENCES pricewaze_properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_avm_results_property_id ON pricewaze_avm_results(property_id);
CREATE INDEX IF NOT EXISTS idx_avm_results_generated_at ON pricewaze_avm_results(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_avm_results_expires_at ON pricewaze_avm_results(expires_at) WHERE expires_at IS NOT NULL;

-- RLS
ALTER TABLE pricewaze_avm_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AVM results for properties they can access"
  ON pricewaze_avm_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_properties p
      WHERE p.id = pricewaze_avm_results.property_id
        AND (
          p.seller_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM pricewaze_offers o
            WHERE o.property_id = p.id AND o.buyer_id = auth.uid()
          )
          OR p.status = 'active' -- Propiedades activas visibles para todos
        )
    )
  );

-- ============================================================================
-- 2. MARKET PRESSURE SNAPSHOT
-- ============================================================================
-- Captura presión de mercado en tiempo real (competencia, visitas, ofertas)
CREATE TABLE IF NOT EXISTS pricewaze_market_pressure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  
  -- Nivel de presión
  pressure_level TEXT NOT NULL CHECK (pressure_level IN ('low', 'medium', 'high', 'critical')),
  direction TEXT NOT NULL CHECK (direction IN ('upward', 'downward', 'neutral')),
  velocity TEXT NOT NULL CHECK (velocity IN ('slow', 'moderate', 'fast')),
  
  -- Señales agregadas
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Ejemplo: {
  --   "active_offers": 3,
  --   "recent_visits_48h": 5,
  --   "views_last_week": 45,
  --   "price_drops": 1,
  --   "days_on_market": 12
  -- }
  
  -- Score numérico (0-100)
  pressure_score NUMERIC(5,2) DEFAULT 50 CHECK (pressure_score >= 0 AND pressure_score <= 100),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT pricewaze_market_pressure_property_id_fkey FOREIGN KEY (property_id)
    REFERENCES pricewaze_properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_market_pressure_property_id ON pricewaze_market_pressure(property_id);
CREATE INDEX IF NOT EXISTS idx_market_pressure_created_at ON pricewaze_market_pressure(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_pressure_property_latest 
  ON pricewaze_market_pressure(property_id, created_at DESC);

-- RLS
ALTER TABLE pricewaze_market_pressure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view market pressure for accessible properties"
  ON pricewaze_market_pressure FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_properties p
      WHERE p.id = pricewaze_market_pressure.property_id
        AND (
          p.seller_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM pricewaze_offers o
            WHERE o.property_id = p.id AND o.buyer_id = auth.uid()
          )
          OR p.status = 'active'
        )
    )
  );

-- ============================================================================
-- 3. MARKET DYNAMICS (Velocidad y Cambio de Régimen)
-- ============================================================================
-- Detecta cambios de régimen y mide velocidad de mercado
CREATE TABLE IF NOT EXISTS pricewaze_market_dynamics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID,
  zone_id UUID REFERENCES pricewaze_zones(id) ON DELETE SET NULL,
  
  -- Velocidad de mercado
  market_velocity TEXT NOT NULL CHECK (market_velocity IN ('accelerating', 'stable', 'decelerating')),
  velocity_score NUMERIC(5,2) DEFAULT 50 CHECK (velocity_score >= 0 AND velocity_score <= 100),
  
  -- Cambio de régimen detectado
  regime_change_detected BOOLEAN DEFAULT false,
  regime_change_date TIMESTAMPTZ,
  regime_change_type TEXT CHECK (regime_change_type IN ('acceleration', 'deceleration', 'stabilization')),
  
  -- Métricas históricas
  price_trend_30d TEXT CHECK (price_trend_30d IN ('rising', 'stable', 'falling')),
  inventory_trend_30d TEXT CHECK (inventory_trend_30d IN ('increasing', 'stable', 'decreasing')),
  activity_trend_30d TEXT CHECK (activity_trend_30d IN ('increasing', 'stable', 'decreasing')),
  
  -- Datos de análisis
  analysis_data JSONB DEFAULT '{}'::jsonb,
  -- Ejemplo: {
  --   "price_change_points": ["2025-01-10T00:00:00Z"],
  --   "velocity_indicators": {"visits": 0.15, "offers": 0.08, "price_changes": -0.05}
  -- }
  
  calculated_at TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  
  CONSTRAINT pricewaze_market_dynamics_property_zone_check 
    CHECK (property_id IS NOT NULL OR zone_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_market_dynamics_property_id ON pricewaze_market_dynamics(property_id);
CREATE INDEX IF NOT EXISTS idx_market_dynamics_zone_id ON pricewaze_market_dynamics(zone_id);
CREATE INDEX IF NOT EXISTS idx_market_dynamics_calculated_at ON pricewaze_market_dynamics(calculated_at DESC);

-- RLS
ALTER TABLE pricewaze_market_dynamics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view market dynamics for accessible properties/zones"
  ON pricewaze_market_dynamics FOR SELECT
  USING (
    property_id IS NULL OR EXISTS (
      SELECT 1 FROM pricewaze_properties p
      WHERE p.id = pricewaze_market_dynamics.property_id
        AND (
          p.seller_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM pricewaze_offers o
            WHERE o.property_id = p.id AND o.buyer_id = auth.uid()
          )
          OR p.status = 'active'
        )
    )
    OR zone_id IS NOT NULL -- Zone-level dynamics visible to all
  );

-- ============================================================================
-- 4. DECISION RISK (Riesgo de Espera vs Actuar)
-- ============================================================================
-- Calcula riesgo de esperar vs actuar ahora
CREATE TABLE IF NOT EXISTS pricewaze_decision_risk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = genérico
  
  -- Riesgo de espera
  wait_risk_level TEXT NOT NULL CHECK (wait_risk_level IN ('low', 'medium', 'high', 'critical')),
  wait_risk_score NUMERIC(5,2) DEFAULT 50 CHECK (wait_risk_score >= 0 AND wait_risk_score <= 100),
  
  -- Riesgo de actuar ahora
  act_now_risk_level TEXT NOT NULL CHECK (act_now_risk_level IN ('low', 'medium', 'high', 'critical')),
  act_now_risk_score NUMERIC(5,2) DEFAULT 50 CHECK (act_now_risk_score >= 0 AND act_now_risk_score <= 100),
  
  -- Recomendación
  recommendation TEXT NOT NULL CHECK (recommendation IN ('wait', 'act_now', 'negotiate', 'monitor')),
  recommendation_confidence NUMERIC(5,2) DEFAULT 50 CHECK (recommendation_confidence >= 0 AND recommendation_confidence <= 100),
  
  -- Escenarios simulados
  scenarios JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Ejemplo: [
  --   {
  --     "action": "wait_7_days",
  --     "probability_lose": 0.35,
  --     "expected_price_change": 0.02,
  --     "risk_factors": ["high_competition", "accelerating_market"]
  --   },
  --   {
  --     "action": "act_now",
  --     "probability_success": 0.65,
  --     "expected_price": 245000,
  --     "risk_factors": ["price_above_estimate", "low_negotiation_power"]
  --   }
  -- ]
  
  -- Factores de riesgo
  risk_factors JSONB DEFAULT '{}'::jsonb,
  -- Ejemplo: {
  --   "high_competition": true,
  --   "accelerating_market": true,
  --   "price_above_estimate": false,
  --   "seller_motivated": true
  -- }
  
  calculated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  CONSTRAINT pricewaze_decision_risk_property_id_fkey FOREIGN KEY (property_id)
    REFERENCES pricewaze_properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_decision_risk_property_id ON pricewaze_decision_risk(property_id);
CREATE INDEX IF NOT EXISTS idx_decision_risk_user_id ON pricewaze_decision_risk(user_id);
CREATE INDEX IF NOT EXISTS idx_decision_risk_calculated_at ON pricewaze_decision_risk(calculated_at DESC);

-- RLS
ALTER TABLE pricewaze_decision_risk ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own decision risk or for properties they can access"
  ON pricewaze_decision_risk FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IS NULL -- Generic risk visible to all with property access
    OR EXISTS (
      SELECT 1 FROM pricewaze_properties p
      WHERE p.id = pricewaze_decision_risk.property_id
        AND (
          p.seller_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM pricewaze_offers o
            WHERE o.property_id = p.id AND o.buyer_id = auth.uid()
          )
          OR p.status = 'active'
        )
    )
  );

-- ============================================================================
-- 5. FAIRNESS SCORES v3 (Multi-dimensional)
-- ============================================================================
-- Fairness Score mejorado con múltiples dimensiones
CREATE TABLE IF NOT EXISTS pricewaze_fairness_scores_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES pricewaze_offers(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  
  -- Fairness multi-dimensional
  price_fairness TEXT NOT NULL CHECK (price_fairness IN ('green', 'yellow', 'red')),
  uncertainty_fairness TEXT NOT NULL CHECK (uncertainty_fairness IN ('green', 'yellow', 'red')),
  risk_fairness TEXT NOT NULL CHECK (risk_fairness IN ('green', 'yellow', 'red')),
  velocity_fairness TEXT NOT NULL CHECK (velocity_fairness IN ('green', 'yellow', 'red')),
  
  -- Scores numéricos (0-100)
  price_score NUMERIC(5,2) DEFAULT 50,
  uncertainty_score NUMERIC(5,2) DEFAULT 50,
  risk_score NUMERIC(5,2) DEFAULT 50,
  velocity_score NUMERIC(5,2) DEFAULT 50,
  
  -- Score compuesto
  overall_fairness_score NUMERIC(5,2) DEFAULT 50 CHECK (overall_fairness_score >= 0 AND overall_fairness_score <= 100),
  
  -- Referencias a otros sistemas
  avm_result_id UUID REFERENCES pricewaze_avm_results(id) ON DELETE SET NULL,
  market_pressure_id UUID REFERENCES pricewaze_market_pressure(id) ON DELETE SET NULL,
  market_dynamics_id UUID REFERENCES pricewaze_market_dynamics(id) ON DELETE SET NULL,
  decision_risk_id UUID REFERENCES pricewaze_decision_risk(id) ON DELETE SET NULL,
  
  -- Versión del modelo
  model_version TEXT NOT NULL DEFAULT 'v3.0',
  
  -- Snapshot de datos usados
  pressure_snapshot JSONB DEFAULT '{}'::jsonb,
  dynamics_snapshot JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT pricewaze_fairness_scores_v3_property_id_fkey FOREIGN KEY (property_id)
    REFERENCES pricewaze_properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fairness_scores_v3_offer_id ON pricewaze_fairness_scores_v3(offer_id);
CREATE INDEX IF NOT EXISTS idx_fairness_scores_v3_property_id ON pricewaze_fairness_scores_v3(property_id);
CREATE INDEX IF NOT EXISTS idx_fairness_scores_v3_created_at ON pricewaze_fairness_scores_v3(created_at DESC);

-- RLS
ALTER TABLE pricewaze_fairness_scores_v3 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fairness scores for their offers or properties they can access"
  ON pricewaze_fairness_scores_v3 FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_offers o
      WHERE o.id = pricewaze_fairness_scores_v3.offer_id
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM pricewaze_properties p
      WHERE p.id = pricewaze_fairness_scores_v3.property_id
        AND (
          p.seller_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM pricewaze_offers o2
            WHERE o2.property_id = p.id AND o2.buyer_id = auth.uid()
          )
        )
    )
  );

-- ============================================================================
-- 6. FUNCIONES DE CÁLCULO
-- ============================================================================

-- Función para obtener el AVM result más reciente válido
CREATE OR REPLACE FUNCTION pricewaze_get_latest_avm_result(p_property_id UUID)
RETURNS TABLE(
  id UUID,
  estimate DECIMAL,
  low_estimate DECIMAL,
  high_estimate DECIMAL,
  confidence NUMERIC,
  uncertainty_level TEXT,
  top_factors JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    avm.id,
    avm.estimate,
    avm.low_estimate,
    avm.high_estimate,
    avm.confidence,
    avm.uncertainty_level,
    avm.top_factors
  FROM pricewaze_avm_results avm
  WHERE avm.property_id = p_property_id
    AND (avm.expires_at IS NULL OR avm.expires_at > now())
  ORDER BY avm.generated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Función para obtener la presión de mercado más reciente
CREATE OR REPLACE FUNCTION pricewaze_get_latest_market_pressure(p_property_id UUID)
RETURNS TABLE(
  id UUID,
  pressure_level TEXT,
  direction TEXT,
  velocity TEXT,
  pressure_score NUMERIC,
  signals JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id,
    mp.pressure_level,
    mp.direction,
    mp.velocity,
    mp.pressure_score,
    mp.signals
  FROM pricewaze_market_pressure mp
  WHERE mp.property_id = p_property_id
  ORDER BY mp.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Función para calcular fairness score v3 (mejorada)
CREATE OR REPLACE FUNCTION pricewaze_calculate_fairness_v3(
  p_offer_amount DECIMAL,
  p_property_id UUID
)
RETURNS TABLE(
  price_fairness TEXT,
  uncertainty_fairness TEXT,
  risk_fairness TEXT,
  velocity_fairness TEXT,
  overall_score NUMERIC,
  price_score NUMERIC,
  uncertainty_score NUMERIC,
  risk_score NUMERIC,
  velocity_score NUMERIC
) AS $$
DECLARE
  v_avm RECORD;
  v_pressure RECORD;
  v_dynamics RECORD;
  v_risk RECORD;
  
  v_price_ratio NUMERIC;
  v_in_range BOOLEAN;
  v_price_score NUMERIC;
  v_uncertainty_score NUMERIC;
  v_risk_score NUMERIC;
  v_velocity_score NUMERIC;
  v_overall_score NUMERIC;
  
  v_price_fairness TEXT;
  v_uncertainty_fairness TEXT;
  v_risk_fairness TEXT;
  v_velocity_fairness TEXT;
BEGIN
  -- Obtener AVM result
  SELECT * INTO v_avm FROM pricewaze_get_latest_avm_result(p_property_id);
  
  -- Obtener presión de mercado
  SELECT * INTO v_pressure FROM pricewaze_get_latest_market_pressure(p_property_id);
  
  -- Obtener dinámicas de mercado
  SELECT * INTO v_dynamics FROM pricewaze_market_dynamics
  WHERE property_id = p_property_id
  ORDER BY calculated_at DESC
  LIMIT 1;
  
  -- Obtener riesgo de decisión
  SELECT * INTO v_risk FROM pricewaze_decision_risk
  WHERE property_id = p_property_id
  ORDER BY calculated_at DESC
  LIMIT 1;
  
  -- Calcular fairness de precio (contra rango ajustado)
  IF v_avm.id IS NOT NULL THEN
    -- Verificar si está en rango
    v_in_range := p_offer_amount >= v_avm.low_estimate AND p_offer_amount <= v_avm.high_estimate;
    
    IF v_in_range THEN
      v_price_ratio := (p_offer_amount - v_avm.low_estimate) / (v_avm.high_estimate - v_avm.low_estimate);
      v_price_score := 50 + (50 * (1 - ABS(v_price_ratio - 0.5) * 2)); -- Máximo en el centro del rango
      v_price_fairness := 'green';
    ELSIF p_offer_amount < v_avm.low_estimate THEN
      v_price_score := 30 + (20 * (p_offer_amount / v_avm.low_estimate));
      v_price_fairness := 'yellow';
    ELSE
      v_price_score := 100 - (30 * ((p_offer_amount - v_avm.high_estimate) / v_avm.high_estimate));
      v_price_fairness := CASE WHEN v_price_score < 30 THEN 'red' ELSE 'yellow' END;
    END IF;
  ELSE
    -- Fallback a cálculo simple
    v_price_score := 50;
    v_price_fairness := 'yellow';
  END IF;
  
  -- Calcular fairness de incertidumbre
  IF v_avm.id IS NOT NULL THEN
    IF v_avm.uncertainty_level = 'low' THEN
      v_uncertainty_score := 80;
      v_uncertainty_fairness := 'green';
    ELSIF v_avm.uncertainty_level = 'medium' THEN
      v_uncertainty_score := 50;
      v_uncertainty_fairness := 'yellow';
    ELSE
      v_uncertainty_score := 20;
      v_uncertainty_fairness := 'red';
    END IF;
  ELSE
    v_uncertainty_score := 50;
    v_uncertainty_fairness := 'yellow';
  END IF;
  
  -- Calcular fairness de riesgo
  IF v_risk.id IS NOT NULL THEN
    IF v_risk.wait_risk_level = 'low' THEN
      v_risk_score := 80;
      v_risk_fairness := 'green';
    ELSIF v_risk.wait_risk_level = 'medium' THEN
      v_risk_score := 50;
      v_risk_fairness := 'yellow';
    ELSE
      v_risk_score := 20;
      v_risk_fairness := 'red';
    END IF;
  ELSE
    v_risk_score := 50;
    v_risk_fairness := 'yellow';
  END IF;
  
  -- Calcular fairness de velocidad
  IF v_dynamics.id IS NOT NULL THEN
    IF v_dynamics.market_velocity = 'stable' THEN
      v_velocity_score := 70;
      v_velocity_fairness := 'green';
    ELSIF v_dynamics.market_velocity = 'accelerating' THEN
      v_velocity_score := 30;
      v_velocity_fairness := 'red';
    ELSE
      v_velocity_score := 60;
      v_velocity_fairness := 'yellow';
    END IF;
  ELSE
    v_velocity_score := 50;
    v_velocity_fairness := 'yellow';
  END IF;
  
  -- Score compuesto (promedio ponderado)
  v_overall_score := (
    v_price_score * 0.4 +
    v_uncertainty_score * 0.2 +
    v_risk_score * 0.2 +
    v_velocity_score * 0.2
  );
  
  RETURN QUERY SELECT
    v_price_fairness,
    v_uncertainty_fairness,
    v_risk_fairness,
    v_velocity_fairness,
    v_overall_score,
    v_price_score,
    v_uncertainty_score,
    v_risk_score,
    v_velocity_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE pricewaze_avm_results IS 'Resultados de modelos AVM con rangos de confianza y factores explicables';
COMMENT ON TABLE pricewaze_market_pressure IS 'Presión de mercado en tiempo real (competencia, visitas, ofertas)';
COMMENT ON TABLE pricewaze_market_dynamics IS 'Velocidad de mercado y detección de cambios de régimen';
COMMENT ON TABLE pricewaze_decision_risk IS 'Riesgo de esperar vs actuar ahora';
COMMENT ON TABLE pricewaze_fairness_scores_v3 IS 'Fairness Score mejorado con múltiples dimensiones (precio, incertidumbre, riesgo, velocidad)';

COMMENT ON FUNCTION pricewaze_get_latest_avm_result IS 'Obtiene el resultado AVM más reciente y válido para una propiedad';
COMMENT ON FUNCTION pricewaze_get_latest_market_pressure IS 'Obtiene la presión de mercado más reciente para una propiedad';
COMMENT ON FUNCTION pricewaze_calculate_fairness_v3 IS 'Calcula fairness score v3 multi-dimensional usando rangos ajustados y contexto de mercado';

