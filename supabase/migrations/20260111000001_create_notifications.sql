-- Migration: Create notifications system
-- Description: Table and functions for in-app notifications, especially for signal confirmations

-- Create notifications table (if it doesn't exist from initial schema)
-- Note: Initial schema may have created this with different columns, so we'll handle both cases
DO $$
BEGIN
  -- Check if table exists with old schema (has 'message' instead of 'body', 'read' instead of 'read_at')
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'pricewaze_notifications'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'pricewaze_notifications' 
      AND column_name = 'message'
    )
  ) THEN
    -- Migrate old schema to new schema
    ALTER TABLE pricewaze_notifications 
      RENAME COLUMN message TO body;
    ALTER TABLE pricewaze_notifications 
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
    UPDATE pricewaze_notifications 
      SET read_at = created_at 
      WHERE read = true AND read_at IS NULL;
    ALTER TABLE pricewaze_notifications 
      DROP COLUMN IF EXISTS read;
  ELSE
    -- Create new table if it doesn't exist
    CREATE TABLE IF NOT EXISTS pricewaze_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      data JSONB DEFAULT '{}'::jsonb,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON pricewaze_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON pricewaze_notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON pricewaze_notifications(created_at DESC);

-- RLS Policies
ALTER TABLE pricewaze_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON pricewaze_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON pricewaze_notifications;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON pricewaze_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON pricewaze_notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to create notification
CREATE OR REPLACE FUNCTION pricewaze_create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO pricewaze_notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION pricewaze_mark_notification_read(
  p_notification_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pricewaze_notifications
  SET read_at = now()
  WHERE id = p_notification_id
    AND user_id = p_user_id
    AND read_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE pricewaze_notifications;

-- Update signal confirmation function to create notifications
-- This will be called when a signal is confirmed (3+ reports)
CREATE OR REPLACE FUNCTION pricewaze_notify_signal_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id UUID;
  v_signal_type TEXT;
  v_users_to_notify UUID[];
  v_user_id UUID;
  v_property_title TEXT;
BEGIN
  -- Get property and signal info from the updated state
  SELECT property_id, signal_type INTO v_property_id, v_signal_type
  FROM pricewaze_property_signal_type_state
  WHERE id = NEW.id
    AND confirmed = true
    AND OLD.confirmed = false; -- Only trigger on confirmation (not on every update)
  
  -- If signal was just confirmed, notify users
  IF v_property_id IS NOT NULL AND v_signal_type IS NOT NULL THEN
    -- Get property title
    SELECT title INTO v_property_title
    FROM pricewaze_properties
    WHERE id = v_property_id;
    
    -- Get all users who reported this signal
    SELECT ARRAY_AGG(DISTINCT user_id) INTO v_users_to_notify
    FROM pricewaze_property_signals_raw
    WHERE property_id = v_property_id
      AND signal_type = v_signal_type;
    
    -- Also notify users who have this property in favorites
    SELECT ARRAY_AGG(DISTINCT user_id) INTO v_users_to_notify
    FROM pricewaze_favorites
    WHERE property_id = v_property_id
      AND user_id != ALL(COALESCE(v_users_to_notify, ARRAY[]::UUID[]));
    
    -- Create notifications for each user
    IF v_users_to_notify IS NOT NULL THEN
      FOREACH v_user_id IN ARRAY v_users_to_notify
      LOOP
        PERFORM pricewaze_create_notification(
          v_user_id,
          'signal_confirmed',
          'Señal confirmada',
          COALESCE(v_property_title, 'Propiedad') || ': ' || 
          (SELECT label FROM pricewaze_signal_types WHERE type = v_signal_type LIMIT 1) || 
          ' ha sido confirmada por la comunidad',
          jsonb_build_object(
            'property_id', v_property_id,
            'signal_type', v_signal_type
          )
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for signal confirmation notifications
DROP TRIGGER IF EXISTS pricewaze_trigger_signal_confirmed_notification ON pricewaze_property_signal_type_state;
CREATE TRIGGER pricewaze_trigger_signal_confirmed_notification
  AFTER UPDATE ON pricewaze_property_signal_type_state
  FOR EACH ROW
  WHEN (NEW.confirmed = true AND OLD.confirmed = false)
  EXECUTE FUNCTION pricewaze_notify_signal_confirmed();

-- Grant permissions
GRANT SELECT, UPDATE ON pricewaze_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION pricewaze_create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION pricewaze_mark_notification_read TO authenticated;

