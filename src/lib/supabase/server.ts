import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { logger } from '@/lib/logger';

/**
 * Clean URL by removing newlines, carriage returns, and whitespace
 * URLs contain :, /, ., etc. which are valid - only remove newlines
 */
function cleanUrl(url: string | undefined): string {
  if (!url) return '';
  // Only remove newlines and trim - preserve all URL characters
  return url.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\r/g, '').trim();
}

/**
 * Clean API key by removing all newlines, carriage returns, and whitespace
 * This is critical because Next.js injects NEXT_PUBLIC_* vars at build time,
 * and if .env.local had a newline, it gets baked into the bundle
 */
function cleanApiKey(key: string | undefined): string {
  if (!key) return '';
  
  // Remove all newlines (\n), carriage returns (\r), and trim whitespace
  const cleaned = key.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\r/g, '').trim();
  
  // Additional safety: remove any remaining non-printable characters except base64 chars
  // Base64 chars: A-Z, a-z, 0-9, +, /, = (and - and _ for URL-safe)
  return cleaned.replace(/[^A-Za-z0-9+\/=\-_]/g, '');
}

// Clean URLs and API keys aggressively to remove any hidden newlines/whitespace that break WebSockets
const supabaseUrl = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanApiKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const supabaseServiceRoleKey = cleanApiKey(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!supabaseUrl) {
  logger.warn('[Supabase Server] Missing NEXT_PUBLIC_SUPABASE_URL');
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Supabase admin client (server-side only)
 * Bypasses RLS policies - use with caution
 * Only created if URL and service key are valid to avoid build-time errors
 */
export const supabaseAdmin = (() => {
  // Don't create client if URL or key are missing
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }
  
  // Validate URL format before creating client
  if (!isValidUrl(supabaseUrl)) {
    logger.error('[Supabase Server] Invalid NEXT_PUBLIC_SUPABASE_URL format:', supabaseUrl.substring(0, 50));
    return null;
  }
  
  try {
    return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (error) {
    logger.error('[Supabase Server] Failed to create admin client:', error);
    return null;
  }
})();

/**
 * Create a Supabase server client with cookie handling
 * Uses anon key and respects RLS policies
 * Also supports Authorization header for API testing
 */
export async function createClient(request?: { headers: Headers }) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  // Check for Authorization header (for API testing)
  const authHeader = request?.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  // If token is provided via Authorization header, use it directly
  if (token) {
    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  // Otherwise, use cookie-based auth (normal flow)
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          const enhancedOptions: CookieOptions = {
            ...options,
            secure: isProduction ? true : options.secure,
            sameSite:
              options.sameSite ||
              (name.startsWith('sb-') && name.includes('auth') ? 'strict' : 'lax'),
            path: options.path || '/',
          };
          cookieStore.set({ name, value, ...enhancedOptions });
        } catch {
          // Cookie setting can fail in middleware, ignore
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
            path: options.path || '/',
          });
        } catch {
          // Cookie removal can fail in middleware, ignore
        }
      },
    },
  });
}
