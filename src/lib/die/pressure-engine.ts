/**
 * Pressure Engine
 * 
 * Calculates current market pressure from signals and competition.
 * 
 * Combines:
 * - Property signals (high_activity, many_visits, competing_offers)
 * - User-reported signals (noise, humidity, etc.)
 * - Competition metrics (active offers, recent visits)
 */

import type { CurrentPressure, DIEInputs } from '@/types/die';

/**
 * Calculate current pressure for a property
 */
export function calculatePressure(
  inputs: DIEInputs
): CurrentPressure {
  const { signals, competition } = inputs;

  // Default values if not provided
  const signalData = signals || {
    highActivity: false,
    manyVisits: false,
    competingOffers: false,
    userReports: 0,
  };

  const competitionData = competition || {
    activeOffers: 0,
    recentVisits: 0,
    views: 0,
  };

  // Calculate pressure score (0-100)
  let pressureScore = 0;

  // Signal contributions
  if (signalData.highActivity) pressureScore += 20;
  if (signalData.manyVisits) pressureScore += 25;
  if (signalData.competingOffers) pressureScore += 30;
  pressureScore += Math.min(15, signalData.userReports * 3); // Max 15 from user reports

  // Competition contributions
  pressureScore += Math.min(20, competitionData.activeOffers * 10); // Max 20 from offers
  pressureScore += Math.min(15, competitionData.recentVisits * 5); // Max 15 from visits
  pressureScore += Math.min(10, competitionData.views / 10); // Max 10 from views (if available)

  // Clamp to 0-100
  pressureScore = Math.max(0, Math.min(100, pressureScore));

  // Determine pressure level
  let level: 'low' | 'medium' | 'high';
  if (pressureScore < 30) {
    level = 'low';
  } else if (pressureScore < 60) {
    level = 'medium';
  } else {
    level = 'high';
  }

  return {
    level,
    signals: signalData,
    competition: competitionData,
    pressureScore,
  };
}

