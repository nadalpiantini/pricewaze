-- Database Optimization: Indexes and Query Performance
-- Adds missing indexes for common query patterns and prepares for pagination

-- ============================================================================
-- 1. PROPERTIES TABLE - Additional Indexes for Filtering
-- ============================================================================

-- Composite index for common filter combinations (status + type + price range)
CREATE INDEX IF NOT EXISTS idx_properties_status_type_price 
  ON pricewaze_properties(status, property_type, price) 
  WHERE status = 'active';

-- Composite index for area filtering
CREATE INDEX IF NOT EXISTS idx_properties_area 
  ON pricewaze_properties(area_m2) 
  WHERE status = 'active';

-- Composite index for bedrooms/bathrooms filtering
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms_bathrooms 
  ON pricewaze_properties(bedrooms, bathrooms) 
  WHERE status = 'active' AND bedrooms IS NOT NULL;

-- Index for created_at (for pagination and sorting)
CREATE INDEX IF NOT EXISTS idx_properties_created_at_desc 
  ON pricewaze_properties(created_at DESC) 
  WHERE status = 'active';

-- Index for zone_id + status (common filter combination)
CREATE INDEX IF NOT EXISTS idx_properties_zone_status 
  ON pricewaze_properties(zone_id, status) 
  WHERE status = 'active';

-- ============================================================================
-- 2. SIGNALS - Additional Indexes
-- ============================================================================

-- Composite index for signal state queries (property + confirmed + strength)
CREATE INDEX IF NOT EXISTS idx_signal_state_property_confirmed 
  ON pricewaze_property_signal_state(property_id, confirmed, strength DESC) 
  WHERE strength > 0;

-- Index for signal type state (new table from migration 20260110000002)
CREATE INDEX IF NOT EXISTS idx_signal_type_state_property 
  ON pricewaze_property_signal_type_state(property_id, confirmed, strength DESC) 
  WHERE strength > 0;

-- Index for signal recalculation queries (by created_at)
CREATE INDEX IF NOT EXISTS idx_signals_raw_property_created 
  ON pricewaze_property_signals_raw(property_id, signal_type, created_at DESC);

-- ============================================================================
-- 3. REVIEWS - Indexes for Pagination
-- ============================================================================

-- Composite index for property reviews with sorting
CREATE INDEX IF NOT EXISTS idx_reviews_property_created 
  ON pricewaze_reviews(property_id, created_at DESC);

-- Index for helpful_count sorting
CREATE INDEX IF NOT EXISTS idx_reviews_property_helpful 
  ON pricewaze_reviews(property_id, helpful_count DESC NULLS LAST);

-- Index for rating sorting
CREATE INDEX IF NOT EXISTS idx_reviews_property_rating 
  ON pricewaze_reviews(property_id, rating DESC);

-- ============================================================================
-- 4. OFFERS - Additional Indexes
-- ============================================================================

-- Composite index for buyer offers with status
CREATE INDEX IF NOT EXISTS idx_offers_buyer_status_created 
  ON pricewaze_offers(buyer_id, status, created_at DESC);

-- Composite index for property offers with status
CREATE INDEX IF NOT EXISTS idx_offers_property_status_created 
  ON pricewaze_offers(property_id, status, created_at DESC);

-- ============================================================================
-- 5. VISITS - Additional Indexes
-- ============================================================================

-- Composite index for visitor visits with status
CREATE INDEX IF NOT EXISTS idx_visits_visitor_status_scheduled 
  ON pricewaze_visits(visitor_id, status, scheduled_at DESC);

-- Index for property visits
CREATE INDEX IF NOT EXISTS idx_visits_property_scheduled 
  ON pricewaze_visits(property_id, scheduled_at DESC);

-- ============================================================================
-- 6. NOTIFICATIONS - Indexes for Pagination
-- ============================================================================

-- Composite index for user notifications with read status and date
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON pricewaze_notifications(user_id, read_at NULLS FIRST, created_at DESC);

-- Index for unread count queries (already exists but ensure it's optimal)
-- Already created in 20260111000001_create_notifications.sql

-- ============================================================================
-- 7. FAVORITES - Additional Indexes
-- ============================================================================

-- Index for property favorites (for notifications)
CREATE INDEX IF NOT EXISTS idx_favorites_property_user 
  ON pricewaze_favorites(property_id, user_id);

-- ============================================================================
-- 8. PROPERTY FOLLOWS - Indexes
-- ============================================================================

-- Index for property follows (already exists in 20260110000011, but ensure)
CREATE INDEX IF NOT EXISTS idx_property_follows_property 
  ON pricewaze_property_follows(property_id);

-- ============================================================================
-- 9. ANALYZE TABLES - Update Statistics
-- ============================================================================

-- Update table statistics for query planner
ANALYZE pricewaze_properties;
ANALYZE pricewaze_property_signal_state;
ANALYZE pricewaze_property_signal_type_state;
ANALYZE pricewaze_property_signals_raw;
ANALYZE pricewaze_reviews;
ANALYZE pricewaze_offers;
ANALYZE pricewaze_visits;
ANALYZE pricewaze_notifications;
ANALYZE pricewaze_favorites;
ANALYZE pricewaze_property_follows;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON INDEX idx_properties_status_type_price IS 'Optimizes common property filter queries (status + type + price)';
COMMENT ON INDEX idx_properties_created_at_desc IS 'Optimizes property listing pagination by creation date';
COMMENT ON INDEX idx_signal_state_property_confirmed IS 'Optimizes signal queries with confirmed status';
COMMENT ON INDEX idx_reviews_property_created IS 'Optimizes review pagination by creation date';
COMMENT ON INDEX idx_offers_buyer_status_created IS 'Optimizes user offer listings with status filtering';
COMMENT ON INDEX idx_notifications_user_read_created IS 'Optimizes notification pagination and unread queries';


