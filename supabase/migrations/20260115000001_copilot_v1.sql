-- ============================================================================
-- PRICEWAZE COPILOT v1 - Schema & Triggers
-- ============================================================================
-- AI Copilot system: alerts, insights, user twin, and AI logs
-- ============================================================================

-- ============================================================================
-- 1. USER TWIN (perfil de decisión del usuario)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_user_twin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  risk_tolerance INTEGER NOT NULL DEFAULT 50 CHECK (risk_tolerance >= 0 AND risk_tolerance <= 100),
  price_sensitivity INTEGER NOT NULL DEFAULT 50 CHECK (price_sensitivity >= 0 AND price_sensitivity <= 100),
  decision_speed INTEGER NOT NULL DEFAULT 50 CHECK (decision_speed >= 0 AND decision_speed <= 100),
  
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_twin_user_id
  ON pricewaze_user_twin(user_id);

COMMENT ON TABLE pricewaze_user_twin IS 'Perfil de decisión del usuario para personalización del Copilot';
COMMENT ON COLUMN pricewaze_user_twin.risk_tolerance IS '0-100: 0=conservador, 100=agresivo';
COMMENT ON COLUMN pricewaze_user_twin.price_sensitivity IS '0-100: 0=flexible, 100=estricto';
COMMENT ON COLUMN pricewaze_user_twin.decision_speed IS '0-100: 0=lento, 100=rápido';

-- ============================================================================
-- 2. PROPERTY INSIGHTS (insights calculados por propiedad)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_property_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  
  fairness_score INTEGER CHECK (fairness_score >= 0 AND fairness_score <= 100),
  overprice_pct NUMERIC(5,2), -- % sobre precio justo
  underprice_pct NUMERIC(5,2), -- % bajo precio justo
  narrative JSONB DEFAULT '{}'::jsonb, -- explicación estructurada
  
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(property_id)
);

CREATE INDEX IF NOT EXISTS idx_property_insights_property_id
  ON pricewaze_property_insights(property_id);

CREATE INDEX IF NOT EXISTS idx_property_insights_fairness
  ON pricewaze_property_insights(fairness_score) WHERE fairness_score IS NOT NULL;

COMMENT ON TABLE pricewaze_property_insights IS 'Insights calculados automáticamente para cada propiedad';
COMMENT ON COLUMN pricewaze_property_insights.narrative IS 'JSON con explicación estructurada para el Copilot';

-- ============================================================================
-- 3. ALERTS (7 tipos de alertas del Copilot)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_copilot_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'overprice_emotional',      -- Sobreprecio emocional
    'bad_timing',                -- Timing incorrecto
    'zone_inflection',           -- Zona en inflexión
    'suboptimal_offer',          -- Oferta subóptima
    'hidden_risk',                -- Riesgo oculto
    'silent_opportunity',        -- Oportunidad silenciosa
    'bad_negotiation'            -- Negociación mal planteada
  )),
  
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  
  metadata JSONB DEFAULT '{}'::jsonb, -- datos adicionales del alert
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_alerts_user_id
  ON pricewaze_copilot_alerts(user_id, resolved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_copilot_alerts_property_id
  ON pricewaze_copilot_alerts(property_id) WHERE property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_copilot_alerts_type
  ON pricewaze_copilot_alerts(alert_type, severity);

CREATE INDEX IF NOT EXISTS idx_copilot_alerts_unresolved
  ON pricewaze_copilot_alerts(user_id, resolved) WHERE resolved = false;

COMMENT ON TABLE pricewaze_copilot_alerts IS 'Alertas del Copilot para guiar decisiones del usuario';
COMMENT ON COLUMN pricewaze_copilot_alerts.metadata IS 'JSON con datos adicionales específicos del tipo de alerta';

-- ============================================================================
-- 4. AI LOGS (debug & confianza - tracking de llamadas a IA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricewaze_ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  context TEXT NOT NULL, -- 'copilot_alert', 'property_insight', 'negotiation_advice', etc.
  input_text TEXT, -- prompt o input JSON
  output_text TEXT, -- respuesta de la IA
  latency_ms INTEGER, -- tiempo de respuesta en ms
  
  metadata JSONB DEFAULT '{}'::jsonb, -- datos adicionales
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id
  ON pricewaze_ai_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_context
  ON pricewaze_ai_logs(context, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at
  ON pricewaze_ai_logs(created_at DESC);

COMMENT ON TABLE pricewaze_ai_logs IS 'Logs de todas las llamadas a IA para debug y análisis de confianza';

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

-- User Twin: usuarios solo ven/editan su propio twin
ALTER TABLE pricewaze_user_twin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own twin"
  ON pricewaze_user_twin FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own twin"
  ON pricewaze_user_twin FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own twin"
  ON pricewaze_user_twin FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Property Insights: todos pueden leer, solo sistema puede escribir
ALTER TABLE pricewaze_property_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view property insights"
  ON pricewaze_property_insights FOR SELECT
  USING (true);

-- Service role puede insertar/actualizar (para triggers y jobs)
-- Nota: esto se maneja con service_role_key en el backend

-- Alerts: usuarios solo ven sus propias alertas
ALTER TABLE pricewaze_copilot_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON pricewaze_copilot_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON pricewaze_copilot_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- AI Logs: usuarios solo ven sus propios logs
ALTER TABLE pricewaze_ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI logs"
  ON pricewaze_ai_logs FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Trigger para actualizar updated_at en user_twin
CREATE OR REPLACE FUNCTION update_user_twin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_twin_updated_at
  BEFORE UPDATE ON pricewaze_user_twin
  FOR EACH ROW
  EXECUTE FUNCTION update_user_twin_updated_at();

-- Trigger para actualizar updated_at en property_insights
CREATE OR REPLACE FUNCTION update_property_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_property_insights_updated_at
  BEFORE UPDATE ON pricewaze_property_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_property_insights_updated_at();

-- ============================================================================
-- 7. FUNCIONES HELPER (para evaluación de alertas)
-- ============================================================================

-- Función para evaluar si una propiedad necesita alerta de "oportunidad silenciosa"
CREATE OR REPLACE FUNCTION evaluate_silent_opportunity(
  p_property_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_underprice_pct NUMERIC;
  v_views_count INTEGER;
BEGIN
  -- Obtener % de subprecio desde insights
  SELECT underprice_pct INTO v_underprice_pct
  FROM pricewaze_property_insights
  WHERE property_id = p_property_id;
  
  -- Si está >10% bajo precio y tiene baja visibilidad, es oportunidad
  IF v_underprice_pct IS NOT NULL AND v_underprice_pct > 10 THEN
    -- TODO: agregar lógica de views_count cuando esté disponible
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Función para crear alerta (helper para triggers futuros)
CREATE OR REPLACE FUNCTION create_copilot_alert(
  p_user_id UUID,
  p_property_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO pricewaze_copilot_alerts (
    user_id,
    property_id,
    alert_type,
    severity,
    message,
    metadata
  ) VALUES (
    p_user_id,
    p_property_id,
    p_alert_type,
    p_severity,
    p_message,
    p_metadata
  )
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_copilot_alert IS 'Helper para crear alertas del Copilot desde triggers o jobs';

-- ============================================================================
-- 8. ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================================================

-- Índice compuesto para búsquedas frecuentes de alertas no resueltas
CREATE INDEX IF NOT EXISTS idx_copilot_alerts_active
  ON pricewaze_copilot_alerts(user_id, resolved, severity, created_at DESC)
  WHERE resolved = false;

-- Índice para búsqueda de insights por fairness score
CREATE INDEX IF NOT EXISTS idx_property_insights_fairness_range
  ON pricewaze_property_insights(property_id, fairness_score)
  WHERE fairness_score IS NOT NULL;

-- ============================================================================
-- 9. TRIGGERS AUTOMÁTICOS (disparan alertas y recalculan insights)
-- ============================================================================

-- Función: Recalcular insights cuando cambia el precio
CREATE OR REPLACE FUNCTION recalculate_property_insights_on_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo recalcular si el precio cambió
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    -- Marcar insights como desactualizados (se recalcularán en job nocturno)
    -- O llamar a función de cálculo si existe
    UPDATE pricewaze_property_insights
    SET updated_at = now()
    WHERE property_id = NEW.id;
    
    -- Si no existe insight, crear placeholder
    INSERT INTO pricewaze_property_insights (property_id, updated_at)
    VALUES (NEW.id, now())
    ON CONFLICT (property_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_insights_on_price_change
  AFTER UPDATE OF price ON pricewaze_properties
  FOR EACH ROW
  WHEN (OLD.price IS DISTINCT FROM NEW.price)
  EXECUTE FUNCTION recalculate_property_insights_on_price_change();

-- Función: Evaluar alertas cuando se crea/actualiza una oferta
CREATE OR REPLACE FUNCTION evaluate_offer_alerts()
RETURNS TRIGGER AS $$
DECLARE
  v_property_price NUMERIC;
  v_offer_price NUMERIC;
  v_fairness_score INTEGER;
  v_underprice_pct NUMERIC;
  v_overprice_pct NUMERIC;
  v_severity TEXT;
  v_message TEXT;
BEGIN
  -- Obtener precio de la propiedad
  SELECT price INTO v_property_price
  FROM pricewaze_properties
  WHERE id = NEW.property_id;
  
  -- Obtener insights de la propiedad
  SELECT fairness_score, underprice_pct, overprice_pct
  INTO v_fairness_score, v_underprice_pct, v_overprice_pct
  FROM pricewaze_property_insights
  WHERE property_id = NEW.property_id;
  
  v_offer_price := NEW.amount;
  
  -- Evaluar "Oferta subóptima"
  IF v_fairness_score IS NOT NULL THEN
    -- Si la oferta está muy por encima del fairness score
    IF v_offer_price > v_property_price * 0.95 AND v_fairness_score < 60 THEN
      v_severity := 'high';
      v_message := format('Tu oferta está %s%% sobre el precio justo del mercado. Considera ajustar.', 
        ROUND(((v_offer_price - v_property_price) / v_property_price * 100)::numeric, 1));
      
      PERFORM create_copilot_alert(
        NEW.buyer_id,
        NEW.property_id,
        'suboptimal_offer',
        v_severity,
        v_message,
        jsonb_build_object(
          'offer_id', NEW.id,
          'offer_amount', v_offer_price,
          'property_price', v_property_price,
          'fairness_score', v_fairness_score
        )
      );
    END IF;
    
    -- Si hay oportunidad de negociar mejor
    IF v_underprice_pct IS NOT NULL AND v_underprice_pct > 10 AND v_offer_price >= v_property_price * 0.90 THEN
      v_severity := 'medium';
      v_message := format('Esta propiedad está %s%% bajo el mercado. Tu oferta podría ser más agresiva.', 
        ROUND(v_underprice_pct::numeric, 1));
      
      PERFORM create_copilot_alert(
        NEW.buyer_id,
        NEW.property_id,
        'silent_opportunity',
        v_severity,
        v_message,
        jsonb_build_object(
          'offer_id', NEW.id,
          'underprice_pct', v_underprice_pct
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_evaluate_offer_alerts
  AFTER INSERT OR UPDATE OF amount ON pricewaze_offers
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'countered'))
  EXECUTE FUNCTION evaluate_offer_alerts();

-- Función: Evaluar alertas cuando se crea una contraoferta
CREATE OR REPLACE FUNCTION evaluate_counteroffer_alerts()
RETURNS TRIGGER AS $$
DECLARE
  v_severity TEXT;
  v_message TEXT;
  v_original_offer_amount NUMERIC;
BEGIN
  -- Si es una contraoferta (tiene parent_offer_id)
  IF NEW.parent_offer_id IS NOT NULL THEN
    -- Obtener monto de la oferta original
    SELECT amount INTO v_original_offer_amount
    FROM pricewaze_offers
    WHERE id = NEW.parent_offer_id;
    
    -- Evaluar si la negociación está bien planteada
    IF v_original_offer_amount IS NOT NULL THEN
      -- Si la contraoferta está muy cerca del original, podría ser "mal planteada"
      IF ABS(NEW.amount - v_original_offer_amount) / v_original_offer_amount < 0.02 THEN
        v_severity := 'medium';
        v_message := 'La contraoferta está muy cerca de tu oferta original. Considera condiciones adicionales (closing date, contingencies).';
        
        PERFORM create_copilot_alert(
          NEW.buyer_id,
          NEW.property_id,
          'bad_negotiation',
          v_severity,
          v_message,
          jsonb_build_object(
            'offer_id', NEW.id,
            'parent_offer_id', NEW.parent_offer_id,
            'counteroffer_amount', NEW.amount,
            'original_amount', v_original_offer_amount
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_evaluate_counteroffer_alerts
  AFTER INSERT ON pricewaze_offers
  FOR EACH ROW
  WHEN (NEW.parent_offer_id IS NOT NULL)
  EXECUTE FUNCTION evaluate_counteroffer_alerts();

-- Función: Marcar insights para recálculo cuando se agrega un comparable
-- (Se dispara cuando se crea una nueva propiedad en la misma zona)
CREATE OR REPLACE FUNCTION mark_insights_for_recalculation()
RETURNS TRIGGER AS $$
BEGIN
  -- Marcar todos los insights de propiedades en la misma zona para recálculo
  UPDATE pricewaze_property_insights
  SET updated_at = now()
  WHERE property_id IN (
    SELECT id FROM pricewaze_properties
    WHERE zone_id = NEW.zone_id
    AND id != NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_insights_on_new_comparable
  AFTER INSERT ON pricewaze_properties
  FOR EACH ROW
  WHEN (NEW.zone_id IS NOT NULL)
  EXECUTE FUNCTION mark_insights_for_recalculation();

-- ============================================================================
-- 10. FUNCIÓN PÚBLICA: Evaluar alertas para un usuario al ver una propiedad
-- ============================================================================
-- Esta función se llama desde el backend cuando un usuario ve una propiedad
CREATE OR REPLACE FUNCTION evaluate_property_alerts_for_user(
  p_user_id UUID,
  p_property_id UUID
)
RETURNS TABLE(alert_id UUID, alert_type TEXT, severity TEXT, message TEXT) AS $$
DECLARE
  v_insight RECORD;
  v_zone_properties_count INTEGER;
  v_recent_visits_count INTEGER;
BEGIN
  -- Obtener insights de la propiedad
  SELECT * INTO v_insight
  FROM pricewaze_property_insights
  WHERE property_id = p_property_id;
  
  -- Si no hay insights, retornar vacío
  IF v_insight IS NULL THEN
    RETURN;
  END IF;
  
  -- Evaluar "Oportunidad silenciosa"
  IF v_insight.underprice_pct IS NOT NULL AND v_insight.underprice_pct > 10 THEN
    -- Verificar si ya existe esta alerta
    IF NOT EXISTS (
      SELECT 1 FROM pricewaze_copilot_alerts
      WHERE user_id = p_user_id
      AND property_id = p_property_id
      AND alert_type = 'silent_opportunity'
      AND resolved = false
    ) THEN
      RETURN QUERY
      SELECT 
        create_copilot_alert(
          p_user_id,
          p_property_id,
          'silent_opportunity',
          'high',
          format('Esta propiedad está %s%% bajo comparables similares. Oportunidad silenciosa.', 
            ROUND(v_insight.underprice_pct::numeric, 1)),
          jsonb_build_object('underprice_pct', v_insight.underprice_pct)
        ) AS alert_id,
        'silent_opportunity'::TEXT AS alert_type,
        'high'::TEXT AS severity,
        format('Esta propiedad está %s%% bajo comparables similares. Oportunidad silenciosa.', 
          ROUND(v_insight.underprice_pct::numeric, 1)) AS message;
    END IF;
  END IF;
  
  -- Evaluar "Sobreprecio emocional"
  IF v_insight.overprice_pct IS NOT NULL AND v_insight.overprice_pct > 15 THEN
    -- Contar propiedades en la zona para ver absorción
    SELECT COUNT(*) INTO v_zone_properties_count
    FROM pricewaze_properties
    WHERE zone_id = (SELECT zone_id FROM pricewaze_properties WHERE id = p_property_id)
    AND status = 'available';
    
    -- Si hay muchas propiedades disponibles (baja absorción)
    IF v_zone_properties_count > 10 THEN
      IF NOT EXISTS (
        SELECT 1 FROM pricewaze_copilot_alerts
        WHERE user_id = p_user_id
        AND property_id = p_property_id
        AND alert_type = 'overprice_emotional'
        AND resolved = false
      ) THEN
        RETURN QUERY
        SELECT 
          create_copilot_alert(
            p_user_id,
            p_property_id,
            'overprice_emotional',
            'medium',
            format('Esta propiedad está %s%% sobre el mercado y la zona tiene alta disponibilidad. Negociación recomendada.', 
              ROUND(v_insight.overprice_pct::numeric, 1)),
            jsonb_build_object('overprice_pct', v_insight.overprice_pct)
          ) AS alert_id,
          'overprice_emotional'::TEXT AS alert_type,
          'medium'::TEXT AS severity,
          format('Esta propiedad está %s%% sobre el mercado y la zona tiene alta disponibilidad. Negociación recomendada.', 
            ROUND(v_insight.overprice_pct::numeric, 1)) AS message;
      END IF;
    END IF;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION evaluate_property_alerts_for_user IS 'Evalúa y crea alertas cuando un usuario ve una propiedad. Llamar desde API: onPropertyViewed()';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

