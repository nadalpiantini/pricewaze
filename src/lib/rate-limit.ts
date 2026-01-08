/**
 * Rate Limiting Utility
 * Supports both in-memory (dev) and Redis/Upstash (production) backends
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

// In-memory store (fallback for development)
const memoryStore: RateLimitStore = {};

// Redis/Upstash configuration
const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_REDIS = !!(UPSTASH_REDIS_URL && UPSTASH_REDIS_TOKEN);

/**
 * Redis-based rate limit check using Upstash REST API
 */
async function checkRateLimitRedis(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;
  const resetAt = (Math.floor(now / windowMs) + 1) * windowMs;

  try {
    // Increment counter with expiry
    const response = await fetch(`${UPSTASH_REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', windowKey],
        ['PEXPIRE', windowKey, String(windowMs)],
      ]),
    });

    if (!response.ok) {
      throw new Error(`Redis error: ${response.status}`);
    }

    const results = await response.json();
    const count = results[0]?.result || 1;
    const allowed = count <= maxRequests;

    return {
      allowed,
      remaining: Math.max(0, maxRequests - count),
      resetAt,
    };
  } catch (error) {
    console.warn('[RateLimit] Redis unavailable, falling back to memory:', error);
    return checkRateLimitMemory(key, maxRequests, windowMs);
  }
}

/**
 * In-memory rate limit check (fallback)
 */
function checkRateLimitMemory(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  let entry = memoryStore[key];

  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    memoryStore[key] = entry;
  }

  const allowed = entry.count < maxRequests;

  if (allowed) {
    entry.count++;
  }

  // Cleanup old entries (1% chance per request)
  if (Math.random() < 0.01) {
    Object.keys(memoryStore).forEach((k) => {
      if (memoryStore[k].resetAt < now) {
        delete memoryStore[k];
      }
    });
  }

  return {
    allowed,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

/**
 * Default rate limits by endpoint
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/copilot/negotiate': {
    maxRequests: 10, // 10 requests
    windowMs: 60 * 1000, // per minute
  },
  '/api/copilot/analyze': {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
  default: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requests per minute for other endpoints
  },
};

/**
 * Check rate limit for a user/endpoint
 * @param identifier - User ID or IP address
 * @param endpoint - API endpoint path
 * @returns Object with allowed status and remaining requests
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  const key = `${identifier}:${endpoint}`;

  if (USE_REDIS) {
    return checkRateLimitRedis(key, config.maxRequests, config.windowMs);
  }

  return checkRateLimitMemory(key, config.maxRequests, config.windowMs);
}

/**
 * Synchronous rate limit check (for backwards compatibility, uses memory only)
 */
export function checkRateLimitSync(
  identifier: string,
  endpoint: string
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  const key = `${identifier}:${endpoint}`;
  return checkRateLimitMemory(key, config.maxRequests, config.windowMs);
}

/**
 * Rate limit middleware for Next.js API routes
 */
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  endpoint: string
) {
  return async (request: Request): Promise<Response> => {
    // Get identifier (user ID from auth or IP address)
    const identifier = request.headers.get('x-user-id') ||
                      request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      'anonymous';

    const result = await checkRateLimit(identifier, endpoint);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again after ${new Date(result.resetAt).toISOString()}`,
          resetAt: result.resetAt,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(RATE_LIMITS[endpoint]?.maxRequests || RATE_LIMITS.default.maxRequests),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.resetAt),
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = await handler(request);
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMITS[endpoint]?.maxRequests || RATE_LIMITS.default.maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(result.resetAt));

    return response;
  };
}

