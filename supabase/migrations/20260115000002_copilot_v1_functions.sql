-- ============================================================================
-- PRICEWAZE COPILOT v1 - Funciones SQL Completas para las 7 Alertas
-- ============================================================================
-- Funciones de detección automática para las 7 alertas del Copilot
-- ============================================================================

-- ============================================================================
-- ALERTA #1: SOBREPRECIO EMOCIONAL
-- ============================================================================

CREATE OR REPLACE FUNCTION pricewaze_detect_emotional_pricing(
  p_property_id UUID
)
RETURNS TABLE (
  is_emotional BOOLEAN,
  confidence DECIMAL(5,2),
  evidence JSONB,
  suggested_price DECIMAL(15,2)
) AS $$
DECLARE
  v_property RECORD;
  v_avm RECORD;
  v_days_on_market INTEGER;
  v_fairness_score DECIMAL(5,2);
  v_has_activity BOOLEAN;
  v_has_competition BOOLEAN;
  v_price_deviation DECIMAL(10,2);
BEGIN
  -- Obtener propiedad
  SELECT p.*, z.avg_price_m2
  INTO v_property
  FROM pricewaze_properties p
  LEFT JOIN pricewaze_zones z ON p.zone_id = z.id
  WHERE p.id = p_property_id;
  
  -- Obtener AVM
  SELECT estimate, low_estimate, high_estimate
  INTO v_avm
  FROM pricewaze_avm_results
  WHERE property_id = p_property_id
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY generated_at DESC
  LIMIT 1;
  
  -- Calcular días en mercado
  v_days_on_market := EXTRACT(DAY FROM (NOW() - v_property.created_at))::INTEGER;
  
  -- Verificar actividad
  v_has_activity := EXISTS (
    SELECT 1 FROM pricewaze_property_signal_state
    WHERE property_id = p_property_id
      AND signal_type IN ('high_activity', 'many_visits')
      AND strength > 50
  );
  
  -- Verificar competencia
  v_has_competition := EXISTS (
    SELECT 1 FROM pricewaze_offers
    WHERE property_id = p_property_id
      AND status IN ('pending', 'countered')
  );
  
  -- Calcular desviación de precio
  IF v_avm.high_estimate IS NOT NULL THEN
    v_price_deviation := ((v_property.price - v_avm.high_estimate) / v_avm.high_estimate) * 100;
  ELSIF v_property.avg_price_m2 IS NOT NULL AND v_property.area_m2 IS NOT NULL THEN
    v_price_deviation := ((v_property.price - (v_property.avg_price_m2 * v_property.area_m2)) / (v_property.avg_price_m2 * v_property.area_m2)) * 100;
  ELSE
    v_price_deviation := 0;
  END IF;
  
  -- Calcular fairness score aproximado
  IF v_price_deviation > 15 THEN
    v_fairness_score := 30;
  ELSIF v_price_deviation > 10 THEN
    v_fairness_score := 40;
  ELSE
    v_fairness_score := 50;
  END IF;
  
  -- Determinar si es precio emocional
  IF v_price_deviation > 12 
     AND v_days_on_market > 60
     AND NOT v_has_activity
     AND NOT v_has_competition
     AND v_fairness_score < 45 THEN
    
    RETURN QUERY SELECT
      TRUE AS is_emotional,
      LEAST(90, 50 + (v_price_deviation - 12) * 2 + (v_days_on_market - 60) / 10) AS confidence,
      jsonb_build_object(
        'price_deviation_pct', v_price_deviation,
        'days_on_market', v_days_on_market,
        'fairness_score', v_fairness_score,
        'has_activity', v_has_activity,
        'has_competition', v_has_competition,
        'avm_high', v_avm.high_estimate,
        'current_price', v_property.price
      ) AS evidence,
      COALESCE(v_avm.estimate, v_property.avg_price_m2 * v_property.area_m2) AS suggested_price;
  ELSE
    RETURN QUERY SELECT FALSE, 0::DECIMAL, '{}'::jsonb, NULL::DECIMAL;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION pricewaze_detect_emotional_pricing IS 'Detecta propiedades con precio emocional (sobrepreciadas por factores emocionales del vendedor)';

-- ============================================================================
-- ALERTA #2: TIMING INCORRECTO
-- ============================================================================

CREATE OR REPLACE FUNCTION pricewaze_detect_timing_issue(
  p_property_id UUID,
  p_user_id UUID,
  p_action TEXT DEFAULT 'viewing' -- 'making_offer' | 'viewing' | 'considering'
)
RETURNS TABLE (
  has_timing_issue BOOLEAN,
  issue_type TEXT,
  severity TEXT,
  recommendation TEXT,
  evidence JSONB
) AS $$
DECLARE
  v_die RECORD;
  v_dynamics RECORD;
  v_competition RECORD;
  v_user_profile RECORD;
  v_recent_velocity_change TEXT;
  v_recent_competition_increase INTEGER;
  v_calendar_timing JSONB;
BEGIN
  -- Obtener análisis DIE
  SELECT * INTO v_die
  FROM pricewaze_decision_risk
  WHERE property_id = p_property_id
  ORDER BY calculated_at DESC
  LIMIT 1;
  
  -- Obtener dinámicas de mercado
  SELECT * INTO v_dynamics
  FROM pricewaze_market_dynamics
  WHERE property_id = p_property_id
  ORDER BY calculated_at DESC
  LIMIT 1;
  
  -- Obtener competencia
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('pending', 'countered')) AS active_offers,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS recent_offers
  INTO v_competition
  FROM pricewaze_offers
  WHERE property_id = p_property_id;
  
  -- Obtener perfil del usuario
  SELECT 
    decision_urgency,
    decision_risk_tolerance,
    decision_objective
  INTO v_user_profile
  FROM pricewaze_profiles
  WHERE id = p_user_id;
  
  -- Detectar cambios recientes
  SELECT market_velocity INTO v_recent_velocity_change
  FROM pricewaze_market_dynamics
  WHERE property_id = p_property_id
    AND calculated_at > NOW() - INTERVAL '7 days'
  ORDER BY calculated_at DESC
  LIMIT 1;
  
  v_recent_competition_increase := COALESCE(v_competition.recent_offers, 0);
  
  -- Analizar timing del calendario
  v_calendar_timing := jsonb_build_object(
    'is_end_of_month', EXTRACT(DAY FROM NOW()) > 25,
    'is_end_of_quarter', EXTRACT(MONTH FROM NOW())::INTEGER % 3 = 0 AND EXTRACT(DAY FROM NOW()) > 25,
    'day_of_week', EXTRACT(DOW FROM NOW())
  );
  
  -- Detectar problemas de timing
  IF v_dynamics.market_velocity = 'accelerating' AND COALESCE(v_die.wait_risk_level, 'low') = 'low' THEN
    RETURN QUERY SELECT
      TRUE,
      'market_accelerating'::TEXT,
      'high'::TEXT,
      'El mercado está acelerando. Si esperas, puede que pierdas la oportunidad.'::TEXT,
      jsonb_build_object(
        'velocity', v_dynamics.market_velocity,
        'wait_risk', v_die.wait_risk_level,
        'recommendation', 'act_now'
      );
  ELSIF v_recent_competition_increase > 2 AND v_competition.active_offers > 0 THEN
    RETURN QUERY SELECT
      TRUE,
      'competition_increasing'::TEXT,
      'high'::TEXT,
      format('La competencia aumentó: %s nuevas ofertas en 7 días.', v_recent_competition_increase)::TEXT,
      jsonb_build_object(
        'recent_offers', v_recent_competition_increase,
        'active_offers', v_competition.active_offers,
        'recommendation', 'act_fast'
      );
  ELSIF (v_calendar_timing->>'is_end_of_month')::BOOLEAN = true AND v_user_profile.decision_urgency = 'low' THEN
    RETURN QUERY SELECT
      TRUE,
      'calendar_pressure'::TEXT,
      'medium'::TEXT,
      'Fin de mes = presión de cierre. Vendedores más flexibles, pero también más competencia.'::TEXT,
      jsonb_build_object(
        'calendar_timing', v_calendar_timing,
        'recommendation', 'negotiate_aggressively'
      );
  ELSE
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, '{}'::jsonb;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION pricewaze_detect_timing_issue IS 'Detecta problemas de timing en decisiones del usuario';

-- ============================================================================
-- ALERTA #3: ZONA EN INFLEXIÓN
-- ============================================================================

CREATE OR REPLACE FUNCTION pricewaze_detect_zone_inflection(
  p_zone_id UUID,
  p_lookback_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  is_inflecting BOOLEAN,
  inflection_type TEXT, -- 'emerging' | 'cooling' | 'accelerating' | 'decelerating'
  confidence DECIMAL(5,2),
  evidence JSONB,
  recommendation TEXT
) AS $$
DECLARE
  v_zone RECORD;
  v_current_velocity TEXT;
  v_previous_velocity TEXT;
  v_price_trend DECIMAL(10,2);
  v_inventory_change INTEGER;
  v_absorption_rate DECIMAL(10,2);
  v_recent_sales INTEGER;
  v_new_listings INTEGER;
BEGIN
  -- Obtener datos de la zona
  SELECT 
    z.*,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') AS active_count,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'sold' AND p.updated_at > NOW() - (p_lookback_days || ' days')::INTERVAL) AS recent_sales,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active' AND p.created_at > NOW() - (p_lookback_days || ' days')::INTERVAL) AS new_listings
  INTO v_zone
  FROM pricewaze_zones z
  LEFT JOIN pricewaze_properties p ON p.zone_id = z.id
  WHERE z.id = p_zone_id
  GROUP BY z.id;
  
  -- Obtener velocity actual
  SELECT market_velocity
  INTO v_current_velocity
  FROM pricewaze_market_dynamics
  WHERE zone_id = p_zone_id
  ORDER BY calculated_at DESC
  LIMIT 1;
  
  -- Obtener velocity anterior (30 días atrás)
  SELECT market_velocity
  INTO v_previous_velocity
  FROM pricewaze_market_dynamics
  WHERE zone_id = p_zone_id
    AND calculated_at < NOW() - INTERVAL '30 days'
  ORDER BY calculated_at DESC
  LIMIT 1;
  
  -- Calcular tendencia de precio
  WITH price_changes AS (
    SELECT 
      AVG(price) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS recent_avg,
      AVG(price) FILTER (WHERE created_at > NOW() - INTERVAL '60 days' AND created_at <= NOW() - INTERVAL '30 days') AS previous_avg
    FROM pricewaze_properties
    WHERE zone_id = p_zone_id AND status = 'active'
  )
  SELECT 
    CASE 
      WHEN previous_avg > 0 THEN ((recent_avg - previous_avg) / previous_avg) * 100
      ELSE 0
    END
  INTO v_price_trend
  FROM price_changes;
  
  -- Calcular cambio de inventario
  v_inventory_change := v_zone.new_listings - v_zone.recent_sales;
  
  -- Calcular tasa de absorción
  v_absorption_rate := CASE 
    WHEN v_zone.active_count > 0 THEN (v_zone.recent_sales::DECIMAL / v_zone.active_count) * 100
    ELSE 0
  END;
  
  -- Determinar tipo de inflexión
  IF v_current_velocity = 'accelerating' AND v_previous_velocity = 'stable' THEN
    -- Zona emergente/acelerando
    IF v_price_trend > 3 AND v_absorption_rate > 20 THEN
      RETURN QUERY SELECT
        TRUE,
        'emerging'::TEXT,
        LEAST(95, 70 + (v_price_trend * 2) + (v_absorption_rate / 2)) AS confidence,
        jsonb_build_object(
          'velocity_change', v_current_velocity || ' → ' || v_previous_velocity,
          'price_trend_pct', v_price_trend,
          'absorption_rate', v_absorption_rate,
          'new_listings', v_zone.new_listings,
          'recent_sales', v_zone.recent_sales
        ) AS evidence,
        'Esta zona está emergiendo. Precios subiendo, alta absorción. Buena oportunidad para comprar antes de que suba más.'::TEXT;
    END IF;
  ELSIF v_current_velocity = 'decelerating' AND v_previous_velocity = 'accelerating' THEN
    -- Zona enfriándose
    IF v_price_trend < -2 AND v_absorption_rate < 10 THEN
      RETURN QUERY SELECT
        TRUE,
        'cooling'::TEXT,
        LEAST(95, 70 + ABS(v_price_trend * 2) + (30 - v_absorption_rate)) AS confidence,
        jsonb_build_object(
          'velocity_change', v_current_velocity || ' → ' || v_previous_velocity,
          'price_trend_pct', v_price_trend,
          'absorption_rate', v_absorption_rate,
          'inventory_change', v_inventory_change
        ) AS evidence,
        'Esta zona está enfriándose. Precios bajando, baja absorción. Considera esperar o negociar agresivamente.'::TEXT;
    END IF;
  END IF;
  
  -- Si no hay inflexión clara
  RETURN QUERY SELECT FALSE, NULL::TEXT, 0::DECIMAL, '{}'::jsonb, NULL::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION pricewaze_detect_zone_inflection IS 'Detecta zonas en inflexión (emergiendo o enfriándose)';

-- ============================================================================
-- ALERTA #4: OFERTA SUBÓPTIMA
-- ============================================================================

CREATE OR REPLACE FUNCTION pricewaze_detect_suboptimal_offer(
  p_offer_id UUID
)
RETURNS TABLE (
  is_suboptimal BOOLEAN,
  issue_type TEXT,
  severity TEXT,
  recommendation TEXT,
  evidence JSONB
) AS $$
DECLARE
  v_offer RECORD;
  v_property RECORD;
  v_fairness RECORD;
  v_negotiation_power INTEGER;
  v_competition INTEGER;
  v_suggested_offers RECORD;
BEGIN
  -- Obtener oferta
  SELECT * INTO v_offer
  FROM pricewaze_offers
  WHERE id = p_offer_id;
  
  -- Obtener propiedad
  SELECT * INTO v_property
  FROM pricewaze_properties
  WHERE id = v_offer.property_id;
  
  -- Obtener fairness breakdown
  SELECT * INTO v_fairness
  FROM pricewaze_calculate_offer_fairness_breakdown(v_offer.property_id, v_offer.amount)
  LIMIT 1;
  
  -- Obtener poder de negociación (simplificado)
  SELECT 
    CASE 
      WHEN COUNT(*) FILTER (WHERE status IN ('pending', 'countered')) = 0 THEN 80
      WHEN COUNT(*) FILTER (WHERE status IN ('pending', 'countered')) = 1 THEN 60
      ELSE 40
    END
  INTO v_negotiation_power
  FROM pricewaze_offers
  WHERE property_id = v_offer.property_id;
  
  -- Contar competencia
  SELECT COUNT(*)
  INTO v_competition
  FROM pricewaze_offers
  WHERE property_id = v_offer.property_id
    AND status IN ('pending', 'countered')
    AND id != p_offer_id;
  
  -- Calcular ofertas sugeridas (simplificado)
  v_suggested_offers := ROW(
    v_property.price * 0.85, -- aggressive
    v_property.price * 0.93, -- balanced
    v_property.price * 0.97  -- conservative
  );
  
  -- Detectar problemas
  -- Problema 1: Oferta demasiado conservadora cuando hay poder
  IF v_negotiation_power > 70 AND v_offer.amount > v_suggested_offers.f1 * 0.98 THEN
    RETURN QUERY SELECT
      TRUE,
      'too_conservative'::TEXT,
      'high'::TEXT,
      format('Tu poder de negociación es alto (%s/100), pero estás ofreciendo cerca del precio conservador. Considera ofrecer $%s (balanceada).', 
        v_negotiation_power, ROUND(v_suggested_offers.f2))::TEXT,
      jsonb_build_object(
        'negotiation_power', v_negotiation_power,
        'current_offer', v_offer.amount,
        'suggested_balanced', v_suggested_offers.f2
      );
  -- Problema 2: Oferta demasiado agresiva cuando hay competencia
  ELSIF v_competition > 0 AND v_offer.amount < v_suggested_offers.f1 * 1.05 THEN
    RETURN QUERY SELECT
      TRUE,
      'too_aggressive'::TEXT,
      'high'::TEXT,
      format('Hay %s ofertas activas. Tu oferta es muy agresiva y probablemente será rechazada. Considera ofrecer $%s para ser competitivo.', 
        v_competition, ROUND(v_suggested_offers.f2))::TEXT,
      jsonb_build_object(
        'competition', v_competition,
        'current_offer', v_offer.amount,
        'suggested_balanced', v_suggested_offers.f2
      );
  -- Problema 3: Oferta fuera del rango justo
  ELSIF v_fairness.price_fairness = 'red' THEN
    RETURN QUERY SELECT
      TRUE,
      'outside_fair_range'::TEXT,
      'high'::TEXT,
      'Tu oferta está fuera del rango justo. Ajusta para tener mejor chance de aceptación.'::TEXT,
      jsonb_build_object(
        'fairness_label', v_fairness.price_fairness,
        'current_offer', v_offer.amount
      );
  ELSE
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, '{}'::jsonb;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION pricewaze_detect_suboptimal_offer IS 'Detecta ofertas subóptimas que no maximizan poder de negociación';

-- ============================================================================
-- ALERTA #5: RIESGO OCULTO
-- ============================================================================

CREATE OR REPLACE FUNCTION pricewaze_detect_hidden_risk(
  p_property_id UUID
)
RETURNS TABLE (
  has_risk BOOLEAN,
  risk_type TEXT,
  severity TEXT,
  message TEXT,
  evidence JSONB
) AS $$
DECLARE
  v_negative_signals INTEGER;
  v_price_reductions INTEGER;
  v_listing_count INTEGER;
  v_days_on_market INTEGER;
  v_zone_issues INTEGER;
BEGIN
  -- Contar señales negativas confirmadas
  SELECT COUNT(*)
  INTO v_negative_signals
  FROM pricewaze_property_signal_state
  WHERE property_id = p_property_id
    AND signal_type IN ('noise', 'humidity', 'misleading_photos', 'price_issue')
    AND confirmed = true
    AND strength > 30;
  
  -- Contar reducciones de precio (simplificado - asumiendo que hay tabla de historial)
  -- Por ahora, verificamos si el precio actual es menor que un precio estimado inicial
  SELECT 
    EXTRACT(DAY FROM (NOW() - created_at))::INTEGER
  INTO v_days_on_market
  FROM pricewaze_properties
  WHERE id = p_property_id;
  
  -- Verificar múltiples listados (simplificado)
  -- En producción, esto requeriría una tabla de historial de listados
  v_listing_count := 1; -- Placeholder
  
  -- Detectar riesgos
  IF v_negative_signals > 0 THEN
    RETURN QUERY SELECT
      TRUE,
      'confirmed_negative_signals'::TEXT,
      'high'::TEXT,
      format('%s señales negativas confirmadas por otros usuarios.', v_negative_signals)::TEXT,
      jsonb_build_object(
        'negative_signals_count', v_negative_signals,
        'recommendation', 'Investiga estos problemas antes de hacer oferta.'
      );
  ELSIF v_days_on_market > 90 AND v_days_on_market < 180 THEN
    RETURN QUERY SELECT
      TRUE,
      'long_market_time'::TEXT,
      'medium'::TEXT,
      format('La propiedad lleva %s días en el mercado. Puede haber un problema no mencionado.', v_days_on_market)::TEXT,
      jsonb_build_object(
        'days_on_market', v_days_on_market,
        'recommendation', 'Investiga por qué no se ha vendido.'
      );
  ELSE
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, '{}'::jsonb;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION pricewaze_detect_hidden_risk IS 'Detecta riesgos ocultos (señales negativas, patrones históricos)';

-- ============================================================================
-- ALERTA #6: OPORTUNIDAD SILENCIOSA
-- ============================================================================

CREATE OR REPLACE FUNCTION pricewaze_detect_silent_opportunity(
  p_property_id UUID
)
RETURNS TABLE (
  is_opportunity BOOLEAN,
  opportunity_score DECIMAL(5,2),
  opportunity_type TEXT, -- 'undervalued' | 'emerging_zone' | 'low_competition' | 'timing'
  evidence JSONB,
  recommendation TEXT
) AS $$
DECLARE
  v_property RECORD;
  v_avm RECORD;
  v_days_on_market INTEGER;
  v_fairness_score DECIMAL(5,2);
  v_has_activity BOOLEAN;
  v_competition_count INTEGER;
  v_zone_emerging BOOLEAN;
  v_price_vs_avm DECIMAL(10,2);
BEGIN
  -- Obtener propiedad
  SELECT p.*, z.name AS zone_name
  INTO v_property
  FROM pricewaze_properties p
  LEFT JOIN pricewaze_zones z ON p.zone_id = z.id
  WHERE p.id = p_property_id;
  
  -- Obtener AVM
  SELECT estimate, low_estimate, high_estimate
  INTO v_avm
  FROM pricewaze_avm_results
  WHERE property_id = p_property_id
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY generated_at DESC
  LIMIT 1;
  
  -- Calcular días en mercado
  v_days_on_market := EXTRACT(DAY FROM (NOW() - v_property.created_at))::INTEGER;
  
  -- Obtener fairness score desde insights
  SELECT fairness_score
  INTO v_fairness_score
  FROM pricewaze_property_insights
  WHERE property_id = p_property_id;
  
  -- Verificar actividad
  v_has_activity := EXISTS (
    SELECT 1 FROM pricewaze_property_signal_state
    WHERE property_id = p_property_id
      AND signal_type IN ('high_activity', 'many_visits')
      AND strength > 30
  );
  
  -- Contar competencia
  SELECT COUNT(*)
  INTO v_competition_count
  FROM pricewaze_offers
  WHERE property_id = p_property_id
    AND status IN ('pending', 'countered');
  
  -- Verificar si zona está emergiendo
  SELECT is_inflecting
  INTO v_zone_emerging
  FROM pricewaze_detect_zone_inflection(v_property.zone_id)
  WHERE inflection_type = 'emerging';
  
  -- Calcular precio vs AVM
  IF v_avm.low_estimate IS NOT NULL THEN
    v_price_vs_avm := ((v_property.price - v_avm.low_estimate) / v_avm.low_estimate) * 100;
  ELSE
    v_price_vs_avm := 0;
  END IF;
  
  -- Detectar oportunidad
  IF COALESCE(v_fairness_score, 50) > 75 
     AND NOT v_has_activity
     AND v_competition_count = 0
     AND v_days_on_market > 30 THEN
    
    -- Determinar tipo de oportunidad
    DECLARE
      v_opportunity_type TEXT;
      v_score DECIMAL(5,2);
    BEGIN
      IF v_price_vs_avm < -5 THEN
        v_opportunity_type := 'undervalued';
        v_score := 85 + ABS(v_price_vs_avm);
      ELSIF v_zone_emerging THEN
        v_opportunity_type := 'emerging_zone';
        v_score := 80;
      ELSIF v_days_on_market > 60 AND v_fairness_score > 80 THEN
        v_opportunity_type := 'low_competition';
        v_score := 75 + (v_days_on_market / 10);
      ELSE
        v_opportunity_type := 'timing';
        v_score := 70;
      END IF;
      
      RETURN QUERY SELECT
        TRUE,
        LEAST(100, v_score) AS opportunity_score,
        v_opportunity_type,
        jsonb_build_object(
          'fairness_score', v_fairness_score,
          'days_on_market', v_days_on_market,
          'price_vs_avm_pct', v_price_vs_avm,
          'has_activity', v_has_activity,
          'competition_count', v_competition_count,
          'zone_emerging', v_zone_emerging
        ) AS evidence,
        CASE v_opportunity_type
          WHEN 'undervalued' THEN 'Esta propiedad está subvaluada. El precio está por debajo del rango justo, pero el fairness score es alto. Oportunidad de compra excelente.'
          WHEN 'emerging_zone' THEN 'Esta propiedad está en una zona emergente. El precio aún no refleja el potencial de la zona. Buena oportunidad de inversión.'
          WHEN 'low_competition' THEN 'Excelente relación precio/valor con poca competencia. La propiedad lleva tiempo en el mercado sin atención, pero el fairness score es alto.'
          ELSE 'Timing perfecto: Buena propiedad, buen precio, sin competencia. Oportunidad de compra.'
        END AS recommendation;
    END;
  ELSE
    RETURN QUERY SELECT FALSE, 0::DECIMAL, NULL::TEXT, '{}'::jsonb, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION pricewaze_detect_silent_opportunity IS 'Detecta oportunidades silenciosas (propiedades con excelente relación precio/valor sin atención)';

-- ============================================================================
-- ALERTA #7: NEGOCIACIÓN MAL PLANTEADA
-- ============================================================================

CREATE OR REPLACE FUNCTION pricewaze_detect_bad_negotiation(
  p_offer_id UUID
)
RETURNS TABLE (
  has_issue BOOLEAN,
  issue_type TEXT,
  severity TEXT,
  recommendation TEXT,
  evidence JSONB
) AS $$
DECLARE
  v_offer RECORD;
  v_negotiation RECORD;
  v_friction RECORD;
  v_rhythm RECORD;
  v_events_count INTEGER;
  v_avg_response_hours NUMERIC;
BEGIN
  -- Obtener oferta
  SELECT * INTO v_offer
  FROM pricewaze_offers
  WHERE id = p_offer_id;
  
  -- Obtener estado de negociación más reciente
  SELECT * INTO v_negotiation
  FROM pricewaze_negotiation_state_snapshots
  WHERE offer_id = p_offer_id
  ORDER BY generated_at DESC
  LIMIT 1;
  
  -- Obtener fricción
  SELECT * INTO v_friction
  FROM pricewaze_negotiation_friction
  WHERE snapshot_id = v_negotiation.id;
  
  -- Obtener ritmo
  SELECT * INTO v_rhythm
  FROM pricewaze_negotiation_rhythm
  WHERE snapshot_id = v_negotiation.id;
  
  -- Contar eventos de negociación
  SELECT COUNT(*)
  INTO v_events_count
  FROM pricewaze_negotiation_events
  WHERE offer_id = p_offer_id;
  
  -- Calcular tiempo promedio de respuesta (simplificado)
  v_avg_response_hours := COALESCE(v_rhythm.avg_response_time_hours, 0);
  
  -- Detectar problemas
  -- Problema 1: Ritmo demasiado lento
  IF v_avg_response_hours > 72 AND v_negotiation.market_pressure = 'increasing' THEN
    RETURN QUERY SELECT
      TRUE,
      'slow_rhythm_high_risk'::TEXT,
      'high'::TEXT,
      'Estás respondiendo muy lento en un mercado que se mueve rápido. Acelera tus respuestas.'::TEXT,
      jsonb_build_object(
        'avg_response_hours', v_avg_response_hours,
        'market_pressure', v_negotiation.market_pressure
      );
  -- Problema 2: Fricción alta
  ELSIF v_friction.friction_level = 'high' THEN
    RETURN QUERY SELECT
      TRUE,
      'high_friction'::TEXT,
      'high'::TEXT,
      format('Fricción alta detectada. Dominante: %s. Considera una concesión estratégica pequeña para reducir fricción.', 
        v_friction.dominant_friction)::TEXT,
      jsonb_build_object(
        'friction_level', v_friction.friction_level,
        'dominant_friction', v_friction.dominant_friction
      );
  ELSE
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, '{}'::jsonb;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION pricewaze_detect_bad_negotiation IS 'Detecta problemas en negociaciones en curso (ritmo, fricción, coherencia)';

-- ============================================================================
-- FUNCIÓN MASTER: Evaluar todas las alertas para una propiedad/usuario
-- ============================================================================

CREATE OR REPLACE FUNCTION pricewaze_evaluate_all_alerts(
  p_user_id UUID,
  p_property_id UUID,
  p_offer_id UUID DEFAULT NULL
)
RETURNS TABLE (
  alert_type TEXT,
  severity TEXT,
  message TEXT,
  metadata JSONB
) AS $$
DECLARE
  v_emotional_pricing RECORD;
  v_timing_issue RECORD;
  v_zone_inflection RECORD;
  v_suboptimal_offer RECORD;
  v_hidden_risk RECORD;
  v_silent_opportunity RECORD;
  v_bad_negotiation RECORD;
  v_zone_id UUID;
BEGIN
  -- Obtener zone_id
  SELECT zone_id INTO v_zone_id
  FROM pricewaze_properties
  WHERE id = p_property_id;
  
  -- 1. Sobreprecio emocional
  SELECT * INTO v_emotional_pricing
  FROM pricewaze_detect_emotional_pricing(p_property_id)
  WHERE is_emotional = true;
  
  IF v_emotional_pricing.is_emotional THEN
    RETURN QUERY SELECT
      'overprice_emotional'::TEXT,
      'high'::TEXT,
      format('Esta propiedad está sobrepreciada por factores emocionales. Precio actual: $%s, Sugerido: $%s', 
        (SELECT price FROM pricewaze_properties WHERE id = p_property_id),
        ROUND(v_emotional_pricing.suggested_price))::TEXT,
      v_emotional_pricing.evidence;
  END IF;
  
  -- 2. Timing incorrecto
  SELECT * INTO v_timing_issue
  FROM pricewaze_detect_timing_issue(p_property_id, p_user_id, 'viewing')
  WHERE has_timing_issue = true;
  
  IF v_timing_issue.has_timing_issue THEN
    RETURN QUERY SELECT
      'bad_timing'::TEXT,
      v_timing_issue.severity,
      v_timing_issue.recommendation,
      v_timing_issue.evidence;
  END IF;
  
  -- 3. Zona en inflexión
  IF v_zone_id IS NOT NULL THEN
    SELECT * INTO v_zone_inflection
    FROM pricewaze_detect_zone_inflection(v_zone_id)
    WHERE is_inflecting = true;
    
    IF v_zone_inflection.is_inflecting THEN
      RETURN QUERY SELECT
        'zone_inflection'::TEXT,
        'medium'::TEXT,
        v_zone_inflection.recommendation,
        v_zone_inflection.evidence;
    END IF;
  END IF;
  
  -- 4. Oferta subóptima (solo si hay offer_id)
  IF p_offer_id IS NOT NULL THEN
    SELECT * INTO v_suboptimal_offer
    FROM pricewaze_detect_suboptimal_offer(p_offer_id)
    WHERE is_suboptimal = true;
    
    IF v_suboptimal_offer.is_suboptimal THEN
      RETURN QUERY SELECT
        'suboptimal_offer'::TEXT,
        v_suboptimal_offer.severity,
        v_suboptimal_offer.recommendation,
        v_suboptimal_offer.evidence;
    END IF;
  END IF;
  
  -- 5. Riesgo oculto
  SELECT * INTO v_hidden_risk
  FROM pricewaze_detect_hidden_risk(p_property_id)
  WHERE has_risk = true;
  
  IF v_hidden_risk.has_risk THEN
    RETURN QUERY SELECT
      'hidden_risk'::TEXT,
      v_hidden_risk.severity,
      v_hidden_risk.message,
      v_hidden_risk.evidence;
  END IF;
  
  -- 6. Oportunidad silenciosa
  SELECT * INTO v_silent_opportunity
  FROM pricewaze_detect_silent_opportunity(p_property_id)
  WHERE is_opportunity = true;
  
  IF v_silent_opportunity.is_opportunity THEN
    RETURN QUERY SELECT
      'silent_opportunity'::TEXT,
      'high'::TEXT,
      v_silent_opportunity.recommendation,
      v_silent_opportunity.evidence;
  END IF;
  
  -- 7. Negociación mal planteada (solo si hay offer_id)
  IF p_offer_id IS NOT NULL THEN
    SELECT * INTO v_bad_negotiation
    FROM pricewaze_detect_bad_negotiation(p_offer_id)
    WHERE has_issue = true;
    
    IF v_bad_negotiation.has_issue THEN
      RETURN QUERY SELECT
        'bad_negotiation'::TEXT,
        v_bad_negotiation.severity,
        v_bad_negotiation.recommendation,
        v_bad_negotiation.evidence;
    END IF;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION pricewaze_evaluate_all_alerts IS 'Evalúa todas las alertas del Copilot para una propiedad/usuario. Función master para uso desde API.';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

