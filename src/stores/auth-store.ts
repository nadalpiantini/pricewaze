import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile } from '@/types/database';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  loginWithGoogle: () => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      isLoading: true,
      isInitialized: false,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),

      initialize: async () => {
        const supabase = createClient();

        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            set({ user: session.user, session });

            // Fetch profile
            const { data: profile } = await supabase
              .from('pricewaze_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              set({ profile: profile as Profile });
            }
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      login: async (email, password) => {
        const supabase = createClient();
        set({ isLoading: true });

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            return { error: error.message };
          }

          if (data.session && data.user) {
            set({ user: data.user, session: data.session });

            // Fetch profile
            const { data: profile } = await supabase
              .from('pricewaze_profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profile) {
              set({ profile: profile as Profile });
            }
          }

          return { error: null };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          return { error: message };
        } finally {
          set({ isLoading: false });
        }
      },

      loginWithGoogle: async () => {
        const supabase = createClient();

        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (error) {
            return { error: error.message };
          }

          return { error: null };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Google login failed';
          return { error: message };
        }
      },

      logout: async () => {
        const supabase = createClient();
        set({ isLoading: true });

        try {
          await supabase.auth.signOut();
          set({ user: null, session: null, profile: null });
        } catch (error) {
          console.error('Logout failed:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      updateProfile: async (updates) => {
        const supabase = createClient();
        const { user } = get();

        if (!user) {
          return { error: 'Not authenticated' };
        }

        try {
          const { data, error } = await supabase
            .from('pricewaze_profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

          if (error) {
            return { error: error.message };
          }

          set({ profile: data as Profile });
          return { error: null };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Update failed';
          return { error: message };
        }
      },

      refreshProfile: async () => {
        const supabase = createClient();
        const { user } = get();

        if (!user) return;

        try {
          const { data: profile } = await supabase
            .from('pricewaze_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profile) {
            set({ profile: profile as Profile });
          }
        } catch (error) {
          console.error('Failed to refresh profile:', error);
        }
      },
    }),
    {
      name: 'pricewaze-auth',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
      }),
    }
  )
);
