import { createBrowserClient } from '@supabase/ssr';
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
  
  // Store original for comparison
  const original = key;
  
  // Remove all newlines (\n), carriage returns (\r), and trim whitespace
  const cleaned = key.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\r/g, '').trim();
  
  // Log warning in development if we found and removed newlines
  if (process.env.NODE_ENV === 'development' && original !== cleaned) {
    console.warn('[Supabase] API key had hidden newlines/whitespace that were removed');
    console.warn('[Supabase] Original length:', original.length, 'Cleaned length:', cleaned.length);
  }
  
  // Additional safety: remove any remaining non-printable characters except base64 chars
  // Base64 chars: A-Z, a-z, 0-9, +, /, = (and - and _ for URL-safe)
  const base64Safe = cleaned.replace(/[^A-Za-z0-9+\/=\-_]/g, '');
  
  if (base64Safe !== cleaned && process.env.NODE_ENV === 'development') {
    console.warn('[Supabase] Removed non-base64 characters from API key');
  }
  
  return base64Safe;
}

export function createClient() {
  // Clean URLs and API keys aggressively to remove any hidden newlines/whitespace that break WebSockets
  // This is critical because Next.js injects NEXT_PUBLIC_* vars at build time
  const supabaseUrl = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = cleanApiKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  // Final verification: check if cleaned key still has %0A (URL-encoded newline)
  // This would indicate the variable in Vercel still has the newline
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const testUrl = `wss://test.supabase.co/realtime/v1/websocket?apikey=${supabaseAnonKey}`;
    if (testUrl.includes('%0A')) {
      console.error('[Supabase] ⚠️ CRITICAL: API key still contains %0A after cleaning!');
      console.error('[Supabase] This means the variable in Vercel has a newline.');
      console.error('[Supabase] Solution: Edit the variable in Vercel Dashboard and remove any newlines.');
    }
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined' || !document.cookie) return [];

          return document.cookie
            .split('; ')
            .reduce<Array<{ name: string; value: string }>>((cookies, cookie) => {
              if (!cookie || !cookie.trim()) return cookies;

              const equalIndex = cookie.indexOf('=');
              if (equalIndex === -1) return cookies;

              const name = cookie.substring(0, equalIndex).trim();
              const value = cookie.substring(equalIndex + 1).trim();

              if (name) {
                try {
                  cookies.push({
                    name,
                    value: decodeURIComponent(value),
                  });
                } catch {
                  cookies.push({ name, value });
                }
              }

              return cookies;
            }, []);
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') {
            logger.warn('[Supabase Client] setAll called in SSR - cookies not set');
            return;
          }

          cookiesToSet.forEach(({ name, value, options }) => {
            if (!name || value === undefined || value === null) return;

            let cookieString = `${name}=${encodeURIComponent(value)}`;
            cookieString += `; path=${options?.path || '/'}`;

            if (options?.maxAge !== undefined && options.maxAge > 0) {
              cookieString += `; max-age=${Math.floor(options.maxAge)}`;
            } else if (options?.expires) {
              cookieString += `; expires=${new Date(options.expires).toUTCString()}`;
            }

            if (options?.domain && typeof window !== 'undefined') {
              const isLocalhost =
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1';
              if (!isLocalhost) {
                cookieString += `; domain=${options.domain}`;
              }
            }

            if (
              options?.secure ||
              (typeof window !== 'undefined' &&
                window.location.protocol === 'https:' &&
                window.location.hostname !== 'localhost' &&
                window.location.hostname !== '127.0.0.1' &&
                process.env.NODE_ENV === 'production')
            ) {
              cookieString += `; secure`;
            }

            const isAuthCookie = name.startsWith('sb-') && name.includes('auth');
            const sameSite = options?.sameSite || (isAuthCookie ? 'strict' : 'lax');
            cookieString += `; samesite=${sameSite}`;

            document.cookie = cookieString;
          });
        },
      },
    }
  );
}
