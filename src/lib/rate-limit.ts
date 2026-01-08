/**
 * Rate Limiting Utility
 * Simple in-memory rate limiting for API routes
 * For production, consider using Redis or Upstash
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

// In-memory store (resets on server restart)
// TODO: Use Redis/Upstash for production
const store: RateLimitStore = {};

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
export function checkRateLimit(
  identifier: string,
  endpoint: string
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  const key = `${identifier}:${endpoint}`;
  const now = Date.now();

  // Get or create entry
  let entry = store[key];

  // Reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    store[key] = entry;
  }

  // Check limit
  const allowed = entry.count < config.maxRequests;
  
  if (allowed) {
    entry.count++;
  }

  // Clean up old entries periodically (simple cleanup)
  if (Math.random() < 0.01) {
    // 1% chance to clean up on each request
    Object.keys(store).forEach((k) => {
      if (store[k].resetAt < now) {
        delete store[k];
      }
    });
  }

  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
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

    const result = checkRateLimit(identifier, endpoint);

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

