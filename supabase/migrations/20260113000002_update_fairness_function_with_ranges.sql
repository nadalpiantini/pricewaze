-- ============================================================================
-- UPDATE FAIRNESS FUNCTION TO USE ADJUSTED RANGES
-- ============================================================================
-- Actualiza pricewaze_calculate_offer_fairness para usar rangos AVM cuando estén disponibles
-- Mantiene compatibilidad con código existente (mismo formato de retorno)
-- ============================================================================

-- Función mejorada que usa rangos AVM si están disponibles
CREATE OR REPLACE FUNCTION pricewaze_calculate_offer_fairness(
  p_offer_amount DECIMAL,
  p_property_id UUID
)
RETURNS TABLE(
  fairness_score NUMERIC,
  fairness_label TEXT,
  fair_price_estimate DECIMAL
) AS $$
DECLARE
  v_property_price DECIMAL;
  v_property_area DECIMAL;
  v_zone_avg_price_m2 DECIMAL;
  v_fair_price_estimate DECIMAL;
  v_fairness_ratio NUMERIC;
  v_label TEXT;
  
  -- Variables para AVM ranges
  v_avm_estimate DECIMAL;
  v_avm_low DECIMAL;
  v_avm_high DECIMAL;
  v_has_avm BOOLEAN := false;
BEGIN
  -- Intentar obtener AVM result más reciente y válido
  SELECT 
    estimate,
    low_estimate,
    high_estimate
  INTO 
    v_avm_estimate,
    v_avm_low,
    v_avm_high
  FROM pricewaze_avm_results
  WHERE property_id = p_property_id
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY generated_at DESC
  LIMIT 1;
  
  -- Si hay AVM result válido, usarlo
  IF v_avm_estimate IS NOT NULL AND v_avm_low IS NOT NULL AND v_avm_high IS NOT NULL THEN
    v_has_avm := true;
    v_fair_price_estimate := v_avm_estimate; -- Usar estimate como referencia principal
    
    -- Calcular fairness ratio contra el rango ajustado
    -- Si está dentro del rango, ratio cercano a 1.0
    -- Si está fuera, ratio refleja distancia del rango
    IF p_offer_amount >= v_avm_low AND p_offer_amount <= v_avm_high THEN
      -- Dentro del rango: normalizar al centro (1.0 = centro del rango)
      v_fairness_ratio := 0.95 + ((p_offer_amount - v_avm_low) / (v_avm_high - v_avm_low)) * 0.10;
      -- Esto mapea [low, high] a [0.95, 1.05] aproximadamente
    ELSIF p_offer_amount < v_avm_low THEN
      -- Por debajo del rango
      v_fairness_ratio := (p_offer_amount / v_avm_low) * 0.95;
    ELSE
      -- Por encima del rango
      v_fairness_ratio := 1.05 + ((p_offer_amount - v_avm_high) / v_avm_high) * 0.20;
    END IF;
  ELSE
    -- Fallback a cálculo original si no hay AVM
    -- Obtener datos de la propiedad
    SELECT price, area_m2, zone_id INTO v_property_price, v_property_area, v_zone_avg_price_m2
    FROM pricewaze_properties
    WHERE id = p_property_id;

    -- Si no hay área, usar precio directo como estimación
    IF v_property_area IS NULL OR v_property_area = 0 THEN
      v_fair_price_estimate := v_property_price;
    ELSE
      -- Intentar obtener avg_price_m2 de la zona
      SELECT avg_price_m2 INTO v_zone_avg_price_m2
      FROM pricewaze_zones
      WHERE id = (SELECT zone_id FROM pricewaze_properties WHERE id = p_property_id);

      -- Si hay zona con avg, usar eso; si no, usar price_per_m2 de la propiedad
      IF v_zone_avg_price_m2 IS NULL OR v_zone_avg_price_m2 = 0 THEN
        v_fair_price_estimate := v_property_price;
      ELSE
        v_fair_price_estimate := v_zone_avg_price_m2 * v_property_area;
      END IF;
    END IF;

    -- Calcular ratio (método original)
    IF v_fair_price_estimate > 0 THEN
      v_fairness_ratio := p_offer_amount / v_fair_price_estimate;
    ELSE
      v_fairness_ratio := 1.0;
    END IF;
  END IF;

  -- Determinar label (mismo criterio para ambos casos)
  IF v_fairness_ratio >= 0.95 AND v_fairness_ratio <= 1.05 THEN
    v_label := 'justa';
  ELSIF v_fairness_ratio >= 0.85 AND v_fairness_ratio < 0.95 THEN
    v_label := 'agresiva';
  ELSIF v_fairness_ratio < 0.85 THEN
    v_label := 'riesgosa';
  ELSE
    v_label := 'generosa';
  END IF;

  RETURN QUERY SELECT 
    v_fairness_ratio,
    v_label,
    v_fair_price_estimate;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comentario actualizado
COMMENT ON FUNCTION pricewaze_calculate_offer_fairness IS 
  'Calcula fairness score de una oferta. Usa rangos AVM si están disponibles, sino usa cálculo basado en zona. Retorna ratio, label y estimación de precio justo.';

