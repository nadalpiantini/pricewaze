import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { logger } from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  logger.warn('[Supabase Server] Missing NEXT_PUBLIC_SUPABASE_URL');
}

/**
 * Supabase admin client (server-side only)
 * Bypasses RLS policies - use with caution
 */
export const supabaseAdmin = supabaseServiceRoleKey
  ? createSupabaseClient(supabaseUrl!, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Create a Supabase server client with cookie handling
 * Uses anon key and respects RLS policies
 */
export async function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

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
