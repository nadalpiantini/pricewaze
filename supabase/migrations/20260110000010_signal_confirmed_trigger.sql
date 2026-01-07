-- FASE 3 - Trigger para notificar cuando una señal se confirma (Waze-style)
-- Notifica solo cuando confirmed cambia de false a true (una sola vez)

-- ============================================================================
-- 1. FUNCTION: notify_signal_confirmed()
-- ============================================================================
-- Usa pg_notify para enviar notificación cuando confirmed pasa de false a true
CREATE OR REPLACE FUNCTION notify_signal_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo notificar cuando confirmed cambia de false a true
  IF NEW.confirmed = true AND (OLD.confirmed = false OR OLD.confirmed IS NULL) THEN
    PERFORM pg_notify(
      'signal_confirmed',
      json_build_object(
        'property_id', NEW.property_id,
        'signal_type', NEW.signal_type,
        'strength', NEW.strength
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. TRIGGER: signal_confirmed_trigger
-- ============================================================================
-- Se ejecuta después de cada UPDATE en property_signal_state
DROP TRIGGER IF EXISTS signal_confirmed_trigger ON pricewaze_property_signal_state;

CREATE TRIGGER signal_confirmed_trigger
  AFTER UPDATE ON pricewaze_property_signal_state
  FOR EACH ROW
  WHEN (NEW.confirmed = true AND (OLD.confirmed = false OR OLD.confirmed IS NULL))
  EXECUTE FUNCTION notify_signal_confirmed();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION notify_signal_confirmed IS 'Notifica vía pg_notify cuando una señal pasa de unconfirmed a confirmed (Waze-style). Solo se dispara una vez por transición.';
COMMENT ON TRIGGER signal_confirmed_trigger ON pricewaze_property_signal_state IS 'Trigger que detecta cuando confirmed cambia de false a true y envía notificación.';

