import { createBrowserClient } from '@supabase/ssr';
import { logger } from '@/lib/logger';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
