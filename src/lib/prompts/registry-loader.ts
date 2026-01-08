/**
 * Prompt Registry Loader
 * 
 * Loads prompts from JSON registry with versioning support
 */

import registryData from '@/prompts/registry.json';

export interface PromptMetadata {
  name: string;
  version: string;
  status: 'active' | 'deprecated' | 'testing';
  temperature: number;
  max_tokens: number;
  model: string;
  created_at: string;
  notes?: string;
}

type RegistryData = Record<string, Record<string, Omit<PromptMetadata, 'name' | 'version'>>>;

/**
 * Get prompt metadata from registry
 */
export function getPromptMetadata(
  name: string,
  version: string
): PromptMetadata | null {
  const registry = registryData as RegistryData;
  const promptVersions = registry[name];

  if (!promptVersions) {
    return null;
  }

  const versionData = promptVersions[version];
  if (!versionData) {
    return null;
  }

  return {
    name,
    version,
    ...versionData,
  };
}

/**
 * Get all versions of a prompt
 */
export function getPromptVersions(name: string): string[] {
  const registry = registryData as RegistryData;
  const promptVersions = registry[name];

  if (!promptVersions) {
    return [];
  }

  return Object.keys(promptVersions);
}

/**
 * Get active version of a prompt
 */
export function getActiveVersion(name: string): string | null {
  const versions = getPromptVersions(name);

  for (const version of versions) {
    const metadata = getPromptMetadata(name, version);
    if (metadata?.status === 'active') {
      return version;
    }
  }

  return versions[0] || null; // Fallback to first version
}

/**
 * Check if a prompt version exists
 */
export function promptVersionExists(name: string, version: string): boolean {
  return getPromptMetadata(name, version) !== null;
}

/**
 * Get all active prompts
 */
export function getAllActivePrompts(): Array<{ name: string; version: string }> {
  const registry = registryData as RegistryData;
  const active: Array<{ name: string; version: string }> = [];

  for (const [name, versions] of Object.entries(registry)) {
    for (const [version, data] of Object.entries(versions)) {
      if (data.status === 'active') {
        active.push({ name, version });
      }
    }
  }

  return active;
}

