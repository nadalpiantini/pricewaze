-- ============================================================================
-- USER DECISION PROFILE (DIE-3 Personalization)
-- ============================================================================
-- Adds decision-making preferences to user profiles for DIE personalization
-- ============================================================================

-- Add decision profile columns to pricewaze_profiles
ALTER TABLE pricewaze_profiles 
ADD COLUMN IF NOT EXISTS decision_urgency TEXT CHECK (decision_urgency IN ('high', 'medium', 'low'));

ALTER TABLE pricewaze_profiles 
ADD COLUMN IF NOT EXISTS decision_risk_tolerance TEXT CHECK (decision_risk_tolerance IN ('conservative', 'moderate', 'aggressive'));

ALTER TABLE pricewaze_profiles 
ADD COLUMN IF NOT EXISTS decision_objective TEXT CHECK (decision_objective IN ('primary_residence', 'investment', 'vacation', 'flip'));

ALTER TABLE pricewaze_profiles 
ADD COLUMN IF NOT EXISTS decision_budget_flexibility TEXT CHECK (decision_budget_flexibility IN ('strict', 'moderate', 'flexible'));

-- Comments
COMMENT ON COLUMN pricewaze_profiles.decision_urgency IS 'User urgency level: high (need property soon), medium (flexible timing), low (exploring)';
COMMENT ON COLUMN pricewaze_profiles.decision_risk_tolerance IS 'Risk tolerance: conservative (avoid risks), moderate (balanced), aggressive (take calculated risks)';
COMMENT ON COLUMN pricewaze_profiles.decision_objective IS 'Purchase objective: primary_residence, investment, vacation, flip';
COMMENT ON COLUMN pricewaze_profiles.decision_budget_flexibility IS 'Budget flexibility: strict (fixed budget), moderate (some flexibility), flexible (can adjust)';

