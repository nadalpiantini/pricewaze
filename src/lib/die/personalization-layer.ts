/**
 * Personalization Layer (DIE-3)
 * 
 * Adapts DIE outputs to user's decision profile.
 * 
 * Key principle: "Just for you" without complexity
 * Uses rules (no model retraining)
 */

import type { UserDecisionProfile, DIEAnalysis, WaitRisk } from '@/types/die';
import { createClient } from '@/lib/supabase/server';

/**
 * Get user decision profile from DB
 */
export async function getUserDecisionProfile(
  userId: string
): Promise<UserDecisionProfile | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('pricewaze_profiles')
    .select('id, decision_urgency, decision_risk_tolerance, decision_objective, decision_budget_flexibility')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  // If no decision profile set, return null (use generic)
  if (!profile.decision_urgency && !profile.decision_risk_tolerance && !profile.decision_objective) {
    return null;
  }

  return {
    userId: profile.id,
    urgency: (profile.decision_urgency as 'high' | 'medium' | 'low') || 'medium',
    riskTolerance: (profile.decision_risk_tolerance as 'conservative' | 'moderate' | 'aggressive') || 'moderate',
    objective: (profile.decision_objective as 'primary_residence' | 'investment' | 'vacation' | 'flip') || 'primary_residence',
    budgetFlexibility: (profile.decision_budget_flexibility as 'strict' | 'moderate' | 'flexible') || 'moderate',
  };
}

/**
 * Personalize DIE analysis based on user profile
 */
export function personalizeDIE(
  analysis: DIEAnalysis,
  userProfile: UserDecisionProfile
): DIEAnalysis {
  // Personalize wait-risk recommendation
  if (analysis.waitRisk) {
    analysis.waitRisk = personalizeWaitRisk(analysis.waitRisk, userProfile);
  }

  // Personalize explanations (add context based on profile)
  analysis.explanations = personalizeExplanations(analysis.explanations, userProfile);

  return analysis;
}

/**
 * Personalize wait-risk based on user profile
 */
function personalizeWaitRisk(
  waitRisk: WaitRisk,
  profile: UserDecisionProfile
): WaitRisk {
  let adjustedRecommendation = waitRisk.recommendation;

  // Urgency adjustments
  if (profile.urgency === 'high') {
    // High urgency: bias towards acting now
    if (waitRisk.recommendation === 'wait_long' || waitRisk.recommendation === 'wait_medium') {
      adjustedRecommendation = 'wait_short';
    }
  } else if (profile.urgency === 'low') {
    // Low urgency: can wait longer
    if (waitRisk.recommendation === 'act_now' && waitRisk.riskByDays.find(r => r.days === 7)?.riskLevel !== 'high') {
      adjustedRecommendation = 'wait_short';
    }
  }

  // Risk tolerance adjustments
  if (profile.riskTolerance === 'conservative') {
    // Conservative: avoid high-risk waits
    const risk7Days = waitRisk.riskByDays.find(r => r.days === 7);
    if (risk7Days && risk7Days.riskLevel === 'high' && adjustedRecommendation !== 'act_now') {
      adjustedRecommendation = 'act_now';
    }
  } else if (profile.riskTolerance === 'aggressive') {
    // Aggressive: can take more risk
    if (waitRisk.recommendation === 'act_now' && waitRisk.riskByDays.find(r => r.days === 14)?.riskLevel === 'medium') {
      adjustedRecommendation = 'wait_short';
    }
  }

  // Objective adjustments
  if (profile.objective === 'investment') {
    // Investors: more patient, focus on value
    if (adjustedRecommendation === 'act_now' && waitRisk.riskByDays.find(r => r.days === 30)?.riskLevel === 'low') {
      adjustedRecommendation = 'wait_medium';
    }
  } else if (profile.objective === 'primary_residence') {
    // Primary residence: balance urgency with value
    // Keep recommendation as is (already balanced)
  } else if (profile.objective === 'flip') {
    // Flippers: act fast if good deal
    if (waitRisk.recommendation === 'wait_long') {
      adjustedRecommendation = 'wait_medium';
    }
  }

  // Budget flexibility adjustments
  if (profile.budgetFlexibility === 'strict') {
    // Strict budget: less room for price increases
    const risk7Days = waitRisk.riskByDays.find(r => r.days === 7);
    if (risk7Days && risk7Days.expectedPriceChange > 0.02 && adjustedRecommendation !== 'act_now') {
      adjustedRecommendation = 'act_now';
    }
  } else if (profile.budgetFlexibility === 'flexible') {
    // Flexible budget: can wait for better deals
    if (adjustedRecommendation === 'act_now' && waitRisk.riskByDays.find(r => r.days === 14)?.riskLevel === 'medium') {
      adjustedRecommendation = 'wait_short';
    }
  }

  // Update trade-offs with personalized context
  const personalizedTradeoffs = personalizeTradeoffs(waitRisk.tradeoffs, profile, adjustedRecommendation);

  return {
    ...waitRisk,
    recommendation: adjustedRecommendation,
    tradeoffs: personalizedTradeoffs,
  };
}

/**
 * Personalize trade-offs explanation
 */
function personalizeTradeoffs(
  tradeoffs: WaitRisk['tradeoffs'],
  profile: UserDecisionProfile,
  recommendation: WaitRisk['recommendation']
): WaitRisk['tradeoffs'] {
  let discipline = tradeoffs.discipline;
  let probability = tradeoffs.probability;

  // Add profile-specific context
  if (profile.objective === 'investment') {
    discipline = `Como inversor, ${discipline.toLowerCase()} Además, esperar puede permitirte encontrar mejores oportunidades de valor.`;
  } else if (profile.objective === 'primary_residence') {
    discipline = `Para tu residencia principal, ${discipline.toLowerCase()} Considera tu necesidad de estabilidad y tiempo de búsqueda.`;
  }

  if (profile.urgency === 'high') {
    probability = `Dado tu nivel de urgencia alto, ${probability.toLowerCase()} El tiempo es un factor crítico en tu decisión.`;
  } else if (profile.urgency === 'low') {
    probability = `Con tu nivel de urgencia bajo, ${probability.toLowerCase()} Tienes más flexibilidad para esperar.`;
  }

  if (profile.riskTolerance === 'conservative') {
    probability = `Considerando tu perfil conservador, ${probability.toLowerCase()} Prioriza la seguridad sobre oportunidades.`;
  } else if (profile.riskTolerance === 'aggressive') {
    discipline = `Con tu tolerancia al riesgo, ${discipline.toLowerCase()} Puedes considerar estrategias más agresivas si el potencial es alto.`;
  }

  return {
    discipline,
    probability,
  };
}

/**
 * Personalize explanations
 */
function personalizeExplanations(
  explanations: DIEAnalysis['explanations'],
  profile: UserDecisionProfile
): DIEAnalysis['explanations'] {
  // Add profile context to decision context
  let decisionContext = explanations.decisionContext;

  if (profile.objective === 'investment') {
    decisionContext += ` Como inversor, prioriza el valor a largo plazo y el potencial de apreciación.`;
  } else if (profile.objective === 'primary_residence') {
    decisionContext += ` Para tu residencia principal, considera el equilibrio entre urgencia y encontrar el lugar adecuado.`;
  }

  if (profile.urgency === 'high') {
    decisionContext += ` Tu urgencia alta sugiere que el timing es crítico.`;
  }

  if (profile.riskTolerance === 'conservative') {
    decisionContext += ` Con un perfil conservador, prioriza decisiones seguras y bien fundamentadas.`;
  }

  return {
    ...explanations,
    decisionContext,
  };
}

