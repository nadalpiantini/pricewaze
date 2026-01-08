-- H) NEGOCIACIÓN AVANZADA
-- H.1 Expiraciones (72h), H.2 Presión multi-buyer, H.3 Fairness Score, H.4 Reglas duras

-- ============================================================================
-- H.1 EXPIRACIONES (72 horas)
-- ============================================================================
-- Cambiar default de expires_at de 7 días a 72 horas
ALTER TABLE pricewaze_offers
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '72 hours');

-- Función para expirar ofertas automáticamente
CREATE OR REPLACE FUNCTION pricewaze_expire_offers()
RETURNS TABLE(expired_count INTEGER) AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  -- Marcar ofertas expiradas
  WITH expired AS (
    UPDATE pricewaze_offers
    SET status = 'expired',
        updated_at = now()
    WHERE status IN ('pending', 'countered')
      AND expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired_count FROM expired;

  -- Nota: Los eventos de expiración se pueden trackear en la tabla de notificaciones
  -- o en logs separados si se necesita historial detallado

  RETURN QUERY SELECT v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- H.2 PRESIÓN MULTI-BUYER (Señales derivadas)
-- ============================================================================
-- Función para calcular active_offers_count por propiedad
CREATE OR REPLACE FUNCTION pricewaze_get_active_offers_count(p_property_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pricewaze_offers
  WHERE property_id = p_property_id
    AND status IN ('pending', 'countered')
    AND expires_at > now();
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Función para calcular recent_visits_spike (visitas en últimas 48h)
CREATE OR REPLACE FUNCTION pricewaze_get_recent_visits_spike(p_property_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pricewaze_visits
  WHERE property_id = p_property_id
    AND verified_at IS NOT NULL
    AND verified_at >= now() - interval '48 hours';
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Función para actualizar señales de presión multi-buyer
CREATE OR REPLACE FUNCTION pricewaze_update_competition_signals(p_property_id UUID)
RETURNS void AS $$
DECLARE
  v_active_offers INTEGER;
  v_recent_visits INTEGER;
BEGIN
  -- Calcular métricas
  v_active_offers := pricewaze_get_active_offers_count(p_property_id);
  v_recent_visits := pricewaze_get_recent_visits_spike(p_property_id);

  -- Si hay 2+ ofertas activas, crear señal de competencia (solo si no existe una reciente)
  IF v_active_offers >= 2 THEN
    -- Verificar si ya existe una señal de este tipo en los últimos 5 minutos
    IF NOT EXISTS (
      SELECT 1 FROM pricewaze_property_signals_raw
      WHERE property_id = p_property_id
        AND signal_type = 'competing_offers'
        AND source = 'system'
        AND created_at >= now() - interval '5 minutes'
    ) THEN
      INSERT INTO pricewaze_property_signals_raw (
        property_id,
        signal_type,
        source,
        created_at
      )
      VALUES (
        p_property_id,
        'competing_offers',
        'system',
        now()
      );
    END IF;
  END IF;

  -- Si hay spike de visitas (3+ en 48h), crear señal (solo si no existe una reciente)
  IF v_recent_visits >= 3 THEN
    -- Verificar si ya existe una señal de este tipo en los últimos 5 minutos
    IF NOT EXISTS (
      SELECT 1 FROM pricewaze_property_signals_raw
      WHERE property_id = p_property_id
        AND signal_type = 'many_visits'
        AND source = 'system'
        AND created_at >= now() - interval '5 minutes'
    ) THEN
      INSERT INTO pricewaze_property_signals_raw (
        property_id,
        signal_type,
        source,
        created_at
      )
      VALUES (
        p_property_id,
        'many_visits',
        'system',
        now()
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- H.3 FAIRNESS SCORE EN OFERTAS
-- ============================================================================
-- Función para calcular fairness score de una oferta
-- offer_fairness = offer_amount / fair_price_estimate
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
BEGIN
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

  -- Calcular ratio
  IF v_fair_price_estimate > 0 THEN
    v_fairness_ratio := p_offer_amount / v_fair_price_estimate;
  ELSE
    v_fairness_ratio := 1.0;
  END IF;

  -- Determinar label
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

-- ============================================================================
-- H.4 REGLAS DURAS (1 oferta activa por comprador/propiedad)
-- ============================================================================
-- Función para cerrar ofertas anteriores cuando se crea una nueva
CREATE OR REPLACE FUNCTION pricewaze_close_previous_offers()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es una nueva oferta (no counter), cerrar ofertas anteriores del mismo comprador
  IF NEW.parent_offer_id IS NULL AND NEW.status = 'pending' THEN
    UPDATE pricewaze_offers
    SET status = 'withdrawn',
        updated_at = now()
    WHERE property_id = NEW.property_id
      AND buyer_id = NEW.buyer_id
      AND id != NEW.id
      AND status IN ('pending', 'countered')
      AND parent_offer_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-cerrar ofertas anteriores
DROP TRIGGER IF EXISTS close_previous_offers_trigger ON pricewaze_offers;
CREATE TRIGGER close_previous_offers_trigger
  AFTER INSERT ON pricewaze_offers
  FOR EACH ROW
  EXECUTE FUNCTION pricewaze_close_previous_offers();

-- ============================================================================
-- TRIGGERS PARA ACTUALIZAR SEÑALES AL CREAR/ACTUALIZAR OFERTAS
-- ============================================================================
CREATE OR REPLACE FUNCTION pricewaze_trigger_update_competition_signals()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pricewaze_update_competition_signals(
    COALESCE(NEW.property_id, OLD.property_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger en insert/update de ofertas
DROP TRIGGER IF EXISTS update_competition_signals_on_offer ON pricewaze_offers;
CREATE TRIGGER update_competition_signals_on_offer
  AFTER INSERT OR UPDATE ON pricewaze_offers
  FOR EACH ROW
  EXECUTE FUNCTION pricewaze_trigger_update_competition_signals();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION pricewaze_expire_offers() IS 'Expira ofertas automáticamente (cron job)';
COMMENT ON FUNCTION pricewaze_get_active_offers_count(UUID) IS 'Cuenta ofertas activas por propiedad';
COMMENT ON FUNCTION pricewaze_get_recent_visits_spike(UUID) IS 'Cuenta visitas recientes (48h) por propiedad';
COMMENT ON FUNCTION pricewaze_calculate_offer_fairness(DECIMAL, UUID) IS 'Calcula fairness score de una oferta vs precio justo estimado';
COMMENT ON FUNCTION pricewaze_close_previous_offers() IS 'Cierra ofertas anteriores cuando se crea una nueva (regla dura)';

