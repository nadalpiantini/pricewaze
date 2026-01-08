/**
 * Prompt Executor
 * 
 * Unified executor that handles:
 * - A/B testing variant selection
 * - Few-shot injection
 * - Metrics tracking
 * - Error handling
 */

import { selectVariantWithSplit, type ABTestConfig } from './ab-testing';
import { getPromptMetadata, getActiveVersion } from './registry-loader';
import { shouldInjectFewShot, getFewShotExamples, injectFewShot } from './few-shot';
import { logPromptMetrics } from './metrics';
import { validatePromptStructure } from './skeleton';

export interface PromptExecutionOptions {
  promptName: string;
  userId: string;
  variant?: string; // Override variant selection
  abTestConfigs?: ABTestConfig[];
  context?: {
    zonePropertyCount?: number;
    priceVariance?: number;
    daysOnMarket?: number;
    negotiationRounds?: number;
    propertyPrice?: number;
    zoneMedian?: number;
    property_id?: string;
    offer_id?: string;
    market?: string;
  };
  buildPromptFn: (version: string) => string; // Function that builds the prompt
}

export interface PromptExecutionResult {
  prompt: string;
  version: string;
  variant: string;
  metadata: {
    temperature: number;
    max_tokens: number;
    model: string;
  };
}

/**
 * Execute a prompt with full system integration
 */
export async function executePrompt(
  options: PromptExecutionOptions
): Promise<PromptExecutionResult> {
  const {
    promptName,
    userId,
    variant: overrideVariant,
    abTestConfigs = [],
    context = {},
    buildPromptFn,
  } = options;

  const startTime = Date.now();

  // 1. Determine variant (A/B testing or active version)
  let selectedVariant: string;
  
  if (overrideVariant) {
    selectedVariant = overrideVariant;
  } else {
    const abConfig = abTestConfigs.find(c => c.promptName === promptName);
    if (abConfig && abConfig.variants.length > 1) {
      selectedVariant = selectVariantWithSplit(userId, abConfig);
    } else {
      selectedVariant = getActiveVersion(promptName) || 'v2';
    }
  }

  // 2. Get prompt metadata
  const metadata = getPromptMetadata(promptName, selectedVariant);
  if (!metadata) {
    throw new Error(`Prompt ${promptName} version ${selectedVariant} not found`);
  }

  // 3. Build base prompt
  let prompt = buildPromptFn(selectedVariant);

  // 4. Validate structure
  const validation = validatePromptStructure(prompt);
  if (!validation.valid) {
    console.warn(`[Prompt Structure] ${promptName} missing sections:`, validation.missingSections);
  }

  // 5. Inject few-shot if needed
  const fewShotContext = shouldInjectFewShot(promptName, context);
  if (fewShotContext) {
    const examples = getFewShotExamples(promptName, fewShotContext);
    if (examples.length > 0) {
      prompt = injectFewShot(prompt, examples);
    }
  }

  // 6. Log execution (async, don't wait)
  const latency = Date.now() - startTime;
  logPromptMetrics({
    prompt_name: promptName,
    prompt_version: selectedVariant,
    user_id: userId,
    latency_ms: latency,
    context: {
      property_id: context.property_id,
      offer_id: context.offer_id,
      market: context.market,
    },
    timestamp: new Date().toISOString(),
  }).catch(err => {
    console.error('[Prompt Metrics] Failed to log:', err);
  });

  return {
    prompt,
    version: selectedVariant,
    variant: selectedVariant,
    metadata: {
      temperature: metadata.temperature,
      max_tokens: metadata.max_tokens,
      model: metadata.model,
    },
  };
}

