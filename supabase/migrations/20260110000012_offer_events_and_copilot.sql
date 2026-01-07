-- FASE 4.2 + 5: Offer Events Timeline + Copilot Analysis System
-- Timeline de negociación con snapshots de señales + Análisis de IA auditables

-- ============================================================================
-- 1. OFFER EVENTS TABLE (Timeline con snapshots de señales)
-- ============================================================================
-- Cada evento de negociación guarda un snapshot de las señales del momento
CREATE TABLE IF NOT EXISTS pricewaze_offer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES pricewaze_offers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'offer_created',
    'offer_sent',
    'counteroffer',
    'accepted',
    'rejected',
    'withdrawn',
    'expired'
  )),
  amount NUMERIC(15,2),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signal_snapshot JSONB, -- Snapshot de señales en el momento del evento
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_events_offer ON pricewaze_offer_events(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_events_created_at ON pricewaze_offer_events(created_at DESC);

-- ============================================================================
-- 2. COPILOT ANALYSES TABLE (Cache + Auditoría)
-- ============================================================================
-- Guarda análisis del copiloto para cache, auditoría y comparación
CREATE TABLE IF NOT EXISTS pricewaze_copilot_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES pricewaze_offers(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL, -- Respuesta estructurada del LLM
  model TEXT NOT NULL DEFAULT 'deepseek-reasoner',
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_analyses_offer ON pricewaze_copilot_analyses(offer_id);
CREATE INDEX IF NOT EXISTS idx_copilot_analyses_created_at ON pricewaze_copilot_analyses(created_at DESC);

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================
ALTER TABLE pricewaze_offer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_copilot_analyses ENABLE ROW LEVEL SECURITY;

-- Offer Events: Participants can view events for their offers
CREATE POLICY "Participants can view offer events"
  ON pricewaze_offer_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_offers o
      WHERE o.id = pricewaze_offer_events.offer_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

-- Copilot Analyses: Participants can view analyses for their offers
CREATE POLICY "Participants can view copilot analyses"
  ON pricewaze_copilot_analyses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_offers o
      WHERE o.id = pricewaze_copilot_analyses.offer_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

-- ============================================================================
-- 4. FUNCTION: Get current signal snapshot for a property
-- ============================================================================
CREATE OR REPLACE FUNCTION get_property_signal_snapshot(p_property_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_snapshot JSONB := '{}';
BEGIN
  SELECT jsonb_object_agg(
    signal_type,
    jsonb_build_object(
      'strength', strength,
      'confirmed', confirmed
    )
  )
  INTO v_snapshot
  FROM pricewaze_property_signal_state
  WHERE property_id = p_property_id
  AND strength > 0;

  RETURN COALESCE(v_snapshot, '{}');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. TRIGGER: Auto-create event when offer status changes
-- ============================================================================
CREATE OR REPLACE FUNCTION create_offer_event_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type TEXT;
  v_signal_snapshot JSONB;
BEGIN
  -- Determine event type based on status change
  IF NEW.status != OLD.status THEN
    v_event_type := CASE NEW.status
      WHEN 'pending' THEN 'offer_sent'
      WHEN 'accepted' THEN 'accepted'
      WHEN 'rejected' THEN 'rejected'
      WHEN 'countered' THEN 'counteroffer'
      WHEN 'withdrawn' THEN 'withdrawn'
      WHEN 'expired' THEN 'expired'
      ELSE NULL
    END;

    -- Only create event if we have a valid event type
    IF v_event_type IS NOT NULL THEN
      -- Get signal snapshot at this moment
      v_signal_snapshot := get_property_signal_snapshot(NEW.property_id);

      -- Create event
      INSERT INTO pricewaze_offer_events (
        offer_id,
        event_type,
        amount,
        actor_id,
        signal_snapshot
      ) VALUES (
        NEW.id,
        v_event_type,
        NEW.amount,
        CASE
          WHEN v_event_type = 'accepted' OR v_event_type = 'rejected' THEN NEW.seller_id
          WHEN v_event_type = 'counteroffer' THEN NEW.seller_id
          WHEN v_event_type = 'withdrawn' THEN NEW.buyer_id
          ELSE NEW.buyer_id
        END,
        v_signal_snapshot
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_offer_event_on_status_change ON pricewaze_offers;
CREATE TRIGGER trigger_offer_event_on_status_change
  AFTER UPDATE ON pricewaze_offers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION create_offer_event_on_status_change();

-- ============================================================================
-- 6. TRIGGER: Auto-create event when offer is first created
-- ============================================================================
CREATE OR REPLACE FUNCTION create_offer_event_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_signal_snapshot JSONB;
  v_event_type TEXT;
BEGIN
  -- Get signal snapshot at creation
  v_signal_snapshot := get_property_signal_snapshot(NEW.property_id);

  -- Determine event type: if status is 'pending', it's already sent
  -- Otherwise it's a draft (future feature)
  v_event_type := CASE
    WHEN NEW.status = 'pending' THEN 'offer_sent'
    ELSE 'offer_created'
  END;

  -- Create initial event
  INSERT INTO pricewaze_offer_events (
    offer_id,
    event_type,
    amount,
    actor_id,
    signal_snapshot
  ) VALUES (
    NEW.id,
    v_event_type,
    NEW.amount,
    NEW.buyer_id,
    v_signal_snapshot
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_offer_event_on_insert ON pricewaze_offers;
CREATE TRIGGER trigger_offer_event_on_insert
  AFTER INSERT ON pricewaze_offers
  FOR EACH ROW
  EXECUTE FUNCTION create_offer_event_on_insert();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE pricewaze_offer_events IS 'Timeline de eventos de negociación con snapshots de señales del mercado (FASE 4.2)';
COMMENT ON TABLE pricewaze_copilot_analyses IS 'Análisis del copiloto de negociación (cache + auditoría) (FASE 5)';
COMMENT ON FUNCTION get_property_signal_snapshot IS 'Obtiene snapshot actual de señales de una propiedad para eventos';

