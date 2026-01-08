/**
 * Prompts System - Main Entry Point
 * 
 * Unified interface for prompt management, A/B testing, metrics, and few-shot
 */

export * from './skeleton';
export * from './ab-testing';
export * from './registry-loader';
export * from './metrics';
export * from './few-shot';

// Re-export from prompts-registry for convenience
export { PROMPTS_REGISTRY, getPromptVersion, shouldABTest, getPromptMetadata as getRegistryMetadata } from '@/prompts/prompts-registry';

