/**
 * Centralized Environment Variable Management
 *
 * Type-safe access to environment variables with validation,
 * defaults, and clear error messages.
 */

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function _required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(value: string | undefined, defaultValue: string): string {
  return value || defaultValue;
}

function optionalBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

// ============================================================================
// SERVER-SIDE ENVIRONMENT (not exposed to client)
// ============================================================================

/**
 * Server-side environment variables
 * Only use these in server-side code (API routes, server components, etc.)
 */
export const serverEnv = {
  // DeepSeek AI Configuration
  get DEEPSEEK_API_KEY() {
    return process.env.DEEPSEEK_API_KEY || '';
  },
  get DEEPSEEK_BASE_URL() {
    return optional(process.env.DEEPSEEK_BASE_URL, 'https://api.deepseek.com');
  },
  get DEEPSEEK_MODEL() {
    return optional(process.env.DEEPSEEK_MODEL, 'deepseek-chat');
  },
  get hasDeepSeek() {
    return !!process.env.DEEPSEEK_API_KEY;
  },

  // Supabase Service Role (for admin operations)
  get SUPABASE_SERVICE_ROLE_KEY() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  },
  get hasServiceRole() {
    return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  },

  // Upstash Redis (for production rate limiting)
  get UPSTASH_REDIS_REST_URL() {
    return process.env.UPSTASH_REDIS_REST_URL || '';
  },
  get UPSTASH_REDIS_REST_TOKEN() {
    return process.env.UPSTASH_REDIS_REST_TOKEN || '';
  },
  get hasUpstashRedis() {
    return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  },

  // CrewAI Multi-Agent System
  get CREWAI_API_URL() {
    return optional(process.env.CREWAI_API_URL, 'http://localhost:8000');
  },

  // Node Environment
  get NODE_ENV() {
    return process.env.NODE_ENV || 'development';
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },
  get isDevelopment() {
    return process.env.NODE_ENV === 'development';
  },
  get isTest() {
    return process.env.NODE_ENV === 'test';
  },
} as const;

// ============================================================================
// CLIENT-SIDE ENVIRONMENT (NEXT_PUBLIC_* variables)
// ============================================================================

/**
 * Client-side environment variables (NEXT_PUBLIC_*)
 * Safe to use in browser code
 */
export const clientEnv = {
  // Supabase
  /**
   * Clean API key by removing all newlines, carriage returns, and whitespace
   * This is critical because Next.js injects NEXT_PUBLIC_* vars at build time,
   * and if .env.local had a newline, it gets baked into the bundle
   */
  _cleanApiKey(key: string | undefined): string {
    if (!key) return '';
    
    // Remove all newlines (\n), carriage returns (\r), and trim whitespace
    const cleaned = key.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\r/g, '').trim();
    
    // Additional safety: remove any remaining non-printable characters except base64 chars
    // Base64 chars: A-Z, a-z, 0-9, +, /, = (and - and _ for URL-safe)
    return cleaned.replace(/[^A-Za-z0-9+\/=\-_]/g, '');
  },
  get SUPABASE_URL() {
    return this._cleanApiKey(process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get SUPABASE_ANON_KEY() {
    return this._cleanApiKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  get hasSupabase() {
    return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },

  // Mapbox
  get MAPBOX_TOKEN() {
    return process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
  },
  get hasMapbox() {
    return !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  },

  // Push Notifications
  get VAPID_PUBLIC_KEY() {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  },
  get hasPush() {
    return !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  },

  // Analytics
  get ANALYTICS_PROVIDER() {
    return (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || 'none') as 'posthog' | 'mixpanel' | 'none';
  },

  // Market Configuration
  get MARKET_CODE() {
    return (process.env.NEXT_PUBLIC_MARKET_CODE || 'global') as 'DO' | 'US' | 'MX' | 'ES' | 'CO' | 'global';
  },

  // Feature Flags
  get DEMO_MODE() {
    return optionalBoolean(process.env.NEXT_PUBLIC_DEMO_MODE, false);
  },
  get INVITATIONS_ENABLED() {
    return optionalBoolean(process.env.NEXT_PUBLIC_INVITATIONS_ENABLED, false);
  },
  get INVITATION_TOKEN() {
    return process.env.NEXT_PUBLIC_INVITATION_TOKEN || '';
  },

  // Feature Toggles
  features: {
    get copilot() {
      return process.env.NEXT_PUBLIC_FEATURE_COPILOT !== 'false';
    },
    get push() {
      return process.env.NEXT_PUBLIC_FEATURE_PUSH !== 'false';
    },
    get paywall() {
      return process.env.NEXT_PUBLIC_FEATURE_PAYWALL !== 'false';
    },
    get advancedTimeline() {
      return process.env.NEXT_PUBLIC_FEATURE_ADVANCED_TIMELINE !== 'false';
    },
    get advancedAlerts() {
      return process.env.NEXT_PUBLIC_FEATURE_ADVANCED_ALERTS !== 'false';
    },
  },
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate required environment variables for server-side operation
 */
export function validateServerEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required for basic operation
  if (!clientEnv.SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
  }
  if (!clientEnv.SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  // Warnings for optional but recommended
  if (!serverEnv.DEEPSEEK_API_KEY) {
    warnings.push('DEEPSEEK_API_KEY not set - AI features will be disabled');
  }
  if (!clientEnv.MAPBOX_TOKEN) {
    warnings.push('NEXT_PUBLIC_MAPBOX_TOKEN not set - Map features will be disabled');
  }
  if (serverEnv.isProduction && !serverEnv.hasUpstashRedis) {
    warnings.push('UPSTASH_REDIS_* not set - Rate limiting will use in-memory fallback');
  }
  if (serverEnv.isProduction && !serverEnv.hasServiceRole) {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY not set - Some admin operations may fail');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate environment and log results (call at app startup)
 */
export function checkEnvOnStartup(): void {
  const result = validateServerEnv();

  if (result.errors.length > 0) {
    console.error('\n[ENV] Configuration errors:');
    result.errors.forEach((e) => console.error(`  - ${e}`));
  }

  if (result.warnings.length > 0 && serverEnv.isDevelopment) {
    console.warn('\n[ENV] Configuration warnings:');
    result.warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  if (!result.valid) {
    if (serverEnv.isProduction) {
      throw new Error('Invalid environment configuration - cannot start in production');
    } else {
      console.warn('\n[ENV] Running with incomplete configuration (development mode)\n');
    }
  }
}

// ============================================================================
// SAFE GETTERS WITH FALLBACKS
// ============================================================================

/**
 * Get DeepSeek configuration with safe fallbacks
 */
export function getDeepSeekConfig() {
  return {
    apiKey: serverEnv.DEEPSEEK_API_KEY,
    baseURL: serverEnv.DEEPSEEK_BASE_URL,
    model: serverEnv.DEEPSEEK_MODEL,
    available: serverEnv.hasDeepSeek,
  };
}

/**
 * Get Supabase configuration
 */
export function getSupabaseConfig() {
  return {
    url: clientEnv.SUPABASE_URL,
    anonKey: clientEnv.SUPABASE_ANON_KEY,
    serviceRoleKey: serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    available: clientEnv.hasSupabase,
    hasServiceRole: serverEnv.hasServiceRole,
  };
}

/**
 * Get Mapbox configuration
 */
export function getMapboxConfig() {
  return {
    token: clientEnv.MAPBOX_TOKEN,
    available: clientEnv.hasMapbox,
  };
}

/**
 * Get rate limiting configuration
 */
export function getRateLimitConfig() {
  return {
    redisUrl: serverEnv.UPSTASH_REDIS_REST_URL,
    redisToken: serverEnv.UPSTASH_REDIS_REST_TOKEN,
    useRedis: serverEnv.hasUpstashRedis,
  };
}
