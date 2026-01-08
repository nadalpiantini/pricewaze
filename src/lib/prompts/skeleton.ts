/**
 * Prompt Skeleton v1.0 (Canonical)
 * 
 * Reusable module for building consistent prompts
 * Think of this as a BaseClass / Interface for all prompts
 */

export interface PromptSkeletonInput {
  role: string;
  mission: string;
  context: string;
  inputData: string;
  task: string;
  outputFormat: string;
  guardrails: string;
  fallback: string;
}

/**
 * Build a prompt following the canonical skeleton
 */
export function buildPrompt({
  role,
  mission,
  context,
  inputData,
  task,
  outputFormat,
  guardrails,
  fallback,
}: PromptSkeletonInput): string {
  return `ROLE:
${role}

MISSION:
${mission}

CONTEXT:
${context}

INPUT DATA:
${inputData}

TASK:
${task}

OUTPUT FORMAT:
${outputFormat}

GUARDRAILS:
${guardrails}

FALLBACK / LIMITATIONS:
${fallback}`.trim();
}

/**
 * Validate that a prompt follows the skeleton structure
 */
export function validatePromptStructure(prompt: string): {
  valid: boolean;
  missingSections: string[];
} {
  const requiredSections = [
    'ROLE:',
    'MISSION:',
    'CONTEXT:',
    'INPUT DATA:',
    'TASK:',
    'OUTPUT FORMAT:',
    'GUARDRAILS:',
    'FALLBACK / LIMITATIONS:',
  ];

  const missingSections = requiredSections.filter(
    section => !prompt.includes(section)
  );

  return {
    valid: missingSections.length === 0,
    missingSections,
  };
}

