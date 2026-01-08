-- Minimal fix: Allow nullable fields for scraped properties
-- This migration only contains ALTER statements, no policies

-- Make owner_id nullable (scraped properties have no owner)
ALTER TABLE pricewaze_properties
  ALTER COLUMN owner_id DROP NOT NULL;

-- Make latitude/longitude nullable (may need geocoding later)
ALTER TABLE pricewaze_properties
  ALTER COLUMN latitude DROP NOT NULL;

ALTER TABLE pricewaze_properties
  ALTER COLUMN longitude DROP NOT NULL;

-- Make area_m2 nullable (not always available from scrapers)
ALTER TABLE pricewaze_properties
  ALTER COLUMN area_m2 DROP NOT NULL;
