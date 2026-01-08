/**
 * Prompts Registry (TypeScript)
 * 
 * Type-safe registry complementing JSON registry
 * Use registry.json as source of truth, this for TypeScript types
 */

import { getPromptMetadata as loadFromJSON } from '@/lib/prompts/registry-loader';

export type PromptVersion = 'v1' | 'v2' | 'v2.1';

export interface PromptMetadata {
  name: string;
  version: PromptVersion;
  module: 'pricing' | 'contracts' | 'copilot' | 'die';
  description: string;
  level: number; // 1-10
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
  avgConfidence?: number;
  avgLatency?: number;
}

export const PROMPTS_REGISTRY: Record<string, PromptMetadata> = {
  'analyzePricing': {
    name: 'analyzePricing',
    version: 'v2.1',
    module: 'pricing',
    description: 'Property pricing analysis with fairness scoring',
    level: 10,
    createdAt: '2026-01-14',
    updatedAt: '2026-01-14',
  },
  'getOfferAdvice': {
    name: 'getOfferAdvice',
    version: 'v2.1',
    module: 'pricing',
    description: 'Seller offer advice and recommendation',
    level: 10,
    createdAt: '2026-01-14',
    updatedAt: '2026-01-14',
  },
  'analyzeZone': {
    name: 'analyzeZone',
    version: 'v2',
    module: 'pricing',
    description: 'Zone market health analysis',
    level: 9,
    createdAt: '2026-01-14',
    updatedAt: '2026-01-14',
  },
  'generateContractDraft': {
    name: 'generateContractDraft',
    version: 'v2',
    module: 'contracts',
    description: 'Bilingual contract draft generation',
    level: 9,
    createdAt: '2026-01-14',
    updatedAt: '2026-01-14',
  },
  'generateOfferLetter': {
    name: 'generateOfferLetter',
    version: 'v2',
    module: 'contracts',
    description: 'Professional offer letter generation',
    level: 9,
    createdAt: '2026-01-14',
    updatedAt: '2026-01-14',
  },
  'CopilotChat': {
    name: 'CopilotChat',
    version: 'v2',
    module: 'copilot',
    description: 'Conversational copilot chat',
    level: 9.5,
    createdAt: '2026-01-14',
    updatedAt: '2026-01-14',
  },
  'CopilotNegotiate': {
    name: 'CopilotNegotiate',
    version: 'v2.1',
    module: 'copilot',
    description: 'Negotiation scenario analysis',
    level: 10,
    createdAt: '2026-01-14',
    updatedAt: '2026-01-14',
  },
  'DIE_Explanations': {
    name: 'DIE_Explanations',
    version: 'v2',
    module: 'die',
    description: 'Decision Intelligence Engine explanations',
    level: 9.5,
    createdAt: '2026-01-14',
    updatedAt: '2026-01-14',
  },
};

/**
 * Get current version of a prompt (from JSON registry)
 */
export function getPromptVersion(name: string): PromptVersion {
  const active = loadFromJSON(name, 'v2.1') || 
                loadFromJSON(name, 'v2') || 
                loadFromJSON(name, 'v1');
  return (active?.version as PromptVersion) || 'v2';
}

/**
 * Check if prompt should use A/B testing
 */
export function shouldABTest(name: string): boolean {
  const prompt = PROMPTS_REGISTRY[name];
  if (!prompt) return false;
  
  // A/B test prompts that are v2.1 or newer
  return prompt.version >= 'v2.1';
}

/**
 * Get prompt metadata
 */
export function getPromptMetadata(name: string): PromptMetadata | undefined {
  return PROMPTS_REGISTRY[name];
}

/**
 * Track prompt usage (for metrics)
 */
export async function trackPromptUsage(
  name: string,
  metadata: {
    latency: number;
    confidence?: string;
    success: boolean;
  }
): Promise<void> {
  // This would integrate with your analytics system
  // For now, just log
  console.log(`[Prompt Metrics] ${name}:`, metadata);
}

