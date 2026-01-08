/**
 * Decision Intelligence Engine (DIE) v1
 * 
 * Main orchestrator that combines:
 * - Uncertainty Engine (price ranges)
 * - Market Dynamics Engine (velocity)
 * - Pressure Engine (signals + competition)
 * - Copilot explanations
 * 
 * DIE-1: No personalization, no wait-risk
 */

import type { DIEAnalysis, DIEInputs, DIEExplanations } from '@/types/die';
import { calculateUncertainty } from './uncertainty-engine';
import { analyzeMarketDynamics } from './dynamics-engine';
import { calculatePressure } from './pressure-engine';
import { calculateWaitRisk } from './wait-risk-engine';
import { generateExplanations } from './copilot-explanations';
import { saveAVMResult } from './save-avm-result';

/**
 * Run complete DIE analysis
 */
export async function analyzeDIE(
  inputs: DIEInputs
): Promise<DIEAnalysis> {
  // Run all engines in parallel (except wait-risk which depends on others)
  const [priceAssessment, marketDynamics, currentPressure] = await Promise.all([
    calculateUncertainty(inputs), // Now async
    Promise.resolve(analyzeMarketDynamics(inputs)),
    Promise.resolve(calculatePressure(inputs)),
  ]);

  // Calculate wait risk (depends on other engines)
  const waitRisk = await calculateWaitRisk(
    inputs,
    marketDynamics,
    currentPressure,
    priceAssessment
  );

  // Generate explanations (async, may call LLM)
  const explanations = await generateExplanations({
    priceAssessment,
    marketDynamics,
    currentPressure,
    property: inputs.property,
  });

  // Save AVM result to DB for future use (fire and forget)
  // This allows the fairness function to use these ranges
  saveAVMResult({
    propertyId: inputs.property.id,
    priceAssessment,
    comparableCount: inputs.zone.properties.length,
  }).catch(err => {
    console.error('Failed to save AVM result (non-critical):', err);
  });

  return {
    propertyId: inputs.property.id,
    requestedAt: new Date().toISOString(),
    version: 'DIE-2', // Updated to DIE-2 with wait-risk
    priceAssessment,
    marketDynamics,
    currentPressure,
    waitRisk, // DIE-2 feature
    explanations,
  };
}

