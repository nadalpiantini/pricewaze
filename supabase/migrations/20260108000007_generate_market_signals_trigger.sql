-- Generate Market Signals Trigger
-- Automatically generates market signals when property prices change
-- This enables real-time market alerts without manual intervention

-- Function to generate price change signals
CREATE OR REPLACE FUNCTION pricewaze_generate_price_signal()
RETURNS TRIGGER AS $$
DECLARE
  v_old_price DECIMAL(15,2);
  v_new_price DECIMAL(15,2);
  v_price_change_pct DECIMAL(10,2);
  v_signal_type TEXT;
  v_severity TEXT;
  v_payload JSONB;
BEGIN
  -- Only process if price actually changed and both prices are valid
  IF OLD.price IS NOT NULL AND NEW.price IS NOT NULL 
     AND OLD.price > 0 AND NEW.price > 0 
     AND OLD.price IS DISTINCT FROM NEW.price THEN
    
    v_old_price := OLD.price;
    v_new_price := NEW.price;
    v_price_change_pct := ((NEW.price - OLD.price) / OLD.price) * 100;
    
    -- Determine signal type and severity
    IF v_price_change_pct < 0 THEN
      -- Price dropped
      v_signal_type := 'price_drop';
      v_price_change_pct := ABS(v_price_change_pct);
      IF v_price_change_pct > 10 THEN
        v_severity := 'critical';
      ELSIF v_price_change_pct > 5 THEN
        v_severity := 'warning';
      ELSE
        v_severity := 'info';
      END IF;
    ELSE
      -- Price increased
      v_signal_type := 'price_increase';
      IF v_price_change_pct > 10 THEN
        v_severity := 'warning';
      ELSE
        v_severity := 'info';
      END IF;
    END IF;
    
    -- Build payload
    v_payload := jsonb_build_object(
      'price_drop_pct', CASE WHEN v_signal_type = 'price_drop' THEN v_price_change_pct ELSE NULL END,
      'price_increase_pct', CASE WHEN v_signal_type = 'price_increase' THEN v_price_change_pct ELSE NULL END,
      'old_price', v_old_price,
      'new_price', v_new_price,
      'days', EXTRACT(EPOCH FROM (NOW() - COALESCE(NEW.created_at, NOW()))) / 86400
    );
    
    -- Insert market signal
    INSERT INTO pricewaze_market_signals (
      property_id,
      zone_id,
      signal_type,
      severity,
      payload
    ) VALUES (
      NEW.id,
      NEW.zone_id,
      v_signal_type,
      v_severity,
      v_payload
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for price changes
DROP TRIGGER IF EXISTS pricewaze_properties_price_signal ON pricewaze_properties;
CREATE TRIGGER pricewaze_properties_price_signal
  AFTER UPDATE ON pricewaze_properties
  FOR EACH ROW
  WHEN (OLD.price IS DISTINCT FROM NEW.price AND NEW.price > 0 AND OLD.price > 0)
  EXECUTE FUNCTION pricewaze_generate_price_signal();

-- Function to generate new listing signal
CREATE OR REPLACE FUNCTION pricewaze_generate_new_listing_signal()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate signal for new active listings
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    INSERT INTO pricewaze_market_signals (
      property_id,
      zone_id,
      signal_type,
      severity,
      payload
    ) VALUES (
      NEW.id,
      NEW.zone_id,
      'new_listing',
      'info',
      jsonb_build_object(
        'property_id', NEW.id,
        'price', NEW.price,
        'property_type', NEW.property_type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new listings
DROP TRIGGER IF EXISTS pricewaze_properties_new_listing_signal ON pricewaze_properties;
CREATE TRIGGER pricewaze_properties_new_listing_signal
  AFTER INSERT OR UPDATE ON pricewaze_properties
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION pricewaze_generate_new_listing_signal();

-- Comments
COMMENT ON FUNCTION pricewaze_generate_price_signal() IS 
  'Automatically generates market signals when property prices change';
COMMENT ON FUNCTION pricewaze_generate_new_listing_signal() IS 
  'Automatically generates market signals for new active listings';

