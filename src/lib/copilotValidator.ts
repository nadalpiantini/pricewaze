/**
 * Copilot Response Validator
 * Ensures LLM responses match expected structure
 */

import type { CopilotAnalysis } from '@/types/copilot';

/**
 * Validates that an object matches CopilotAnalysis structure
 */
export function isValidAnalysis(a: unknown): a is CopilotAnalysis {
  if (!a || typeof a !== 'object') {
    return false;
  }

  const analysis = a as Record<string, unknown>;

  // Check required fields
  if (typeof analysis.summary !== 'string') {
    return false;
  }

  if (!Array.isArray(analysis.key_factors)) {
    return false;
  }

  if (!Array.isArray(analysis.risks)) {
    return false;
  }

  if (!Array.isArray(analysis.scenarios)) {
    return false;
  }

  // Validate confidence_level
  const validConfidence: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
  if (!validConfidence.includes(analysis.confidence_level as 'low' | 'medium' | 'high')) {
    return false;
  }

  // Validate scenarios structure
  for (const scenario of analysis.scenarios) {
    if (typeof scenario !== 'object') {
      return false;
    }
    const s = scenario as Record<string, unknown>;
    if (
      typeof s.option !== 'string' ||
      typeof s.rationale !== 'string' ||
      !Array.isArray(s.pros) ||
      !Array.isArray(s.cons)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse(text: string): unknown {
  try {
    // Remove markdown code blocks if present
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * Fallback analysis when LLM fails or data is insufficient
 */
export function fallbackAnalysis(): CopilotAnalysis {
  return {
    summary: 'Insufficient data to analyze negotiation reliably.',
    key_factors: [],
    risks: ['Limited market signals available'],
    scenarios: [],
    confidence_level: 'low',
  };
}

