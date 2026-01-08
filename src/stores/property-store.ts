import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Property } from '@/types/database';

// Client-side logger (structured console for stores)
const storeLogger = {
  warn: (message: string, context?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[PropertyStore] ${message}`, context);
    }
  },
};

interface PropertyState {
  // Favorites
  favorites: string[]; // Property IDs
  favoritesLoading: boolean;

  // Recently viewed
  recentlyViewed: Property[];
  maxRecentlyViewed: number;

  // User properties cache
  userProperties: Property[];
  userPropertiesLoading: boolean;

  // Actions
  addFavorite: (propertyId: string) => Promise<void>;
  removeFavorite: (propertyId: string) => Promise<void>;
  toggleFavorite: (propertyId: string) => Promise<void>;
  isFavorite: (propertyId: string) => boolean;
  fetchFavorites: () => Promise<void>;
  setFavoritesLoading: (loading: boolean) => void;

  addRecentlyViewed: (property: Property) => void;
  clearRecentlyViewed: () => void;

  setUserProperties: (properties: Property[]) => void;
  setUserPropertiesLoading: (loading: boolean) => void;
  fetchUserProperties: () => Promise<void>;
}

export const usePropertyStore = create<PropertyState>()(
  persist(
    (set, get) => ({
      favorites: [],
      favoritesLoading: false,
      recentlyViewed: [],
      maxRecentlyViewed: 10,
      userProperties: [],
      userPropertiesLoading: false,

      addFavorite: async (propertyId) => {
        set({ favoritesLoading: true });

        try {
          const response = await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ property_id: propertyId }),
          });

          if (response.ok) {
            set((state) => ({
              favorites: [...state.favorites, propertyId],
            }));
          }
        } catch (error) {
          storeLogger.warn('Failed to add favorite', error);
        } finally {
          set({ favoritesLoading: false });
        }
      },

      removeFavorite: async (propertyId) => {
        set({ favoritesLoading: true });

        try {
          const response = await fetch(`/api/favorites/${propertyId}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            set((state) => ({
              favorites: state.favorites.filter((id) => id !== propertyId),
            }));
          }
        } catch (error) {
          storeLogger.warn('Failed to remove favorite', error);
        } finally {
          set({ favoritesLoading: false });
        }
      },

      toggleFavorite: async (propertyId) => {
        const { favorites, addFavorite, removeFavorite } = get();

        if (favorites.includes(propertyId)) {
          await removeFavorite(propertyId);
        } else {
          await addFavorite(propertyId);
        }
      },

      isFavorite: (propertyId) => {
        return get().favorites.includes(propertyId);
      },

      fetchFavorites: async () => {
        set({ favoritesLoading: true });

        try {
          const response = await fetch('/api/favorites');

          if (response.ok) {
            const data = await response.json();
            // Ensure data is an array before using .map()
            const safeData = Array.isArray(data) ? data : [];
            set({ favorites: safeData.map((f: { property_id: string }) => f.property_id) });
          }
        } catch (error) {
          storeLogger.warn('Failed to fetch favorites', error);
        } finally {
          set({ favoritesLoading: false });
        }
      },

      setFavoritesLoading: (loading) => set({ favoritesLoading: loading }),

      addRecentlyViewed: (property) => {
        set((state) => {
          // Remove if already exists
          const filtered = state.recentlyViewed.filter((p) => p.id !== property.id);

          // Add to beginning and limit to max
          const updated = [property, ...filtered].slice(0, state.maxRecentlyViewed);

          return { recentlyViewed: updated };
        });
      },

      clearRecentlyViewed: () => set({ recentlyViewed: [] }),

      setUserProperties: (properties) => set({ userProperties: properties }),

      setUserPropertiesLoading: (loading) => set({ userPropertiesLoading: loading }),

      fetchUserProperties: async () => {
        set({ userPropertiesLoading: true });

        try {
          const response = await fetch('/api/properties?owner=me');

          if (response.ok) {
            const result = await response.json();
            // API returns { data: [...], pagination: {...} }, extract data array
            const data = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
            set({ userProperties: data });
          }
        } catch (error) {
          storeLogger.warn('Failed to fetch user properties', error);
        } finally {
          set({ userPropertiesLoading: false });
        }
      },
    }),
    {
      name: 'pricewaze-property',
      partialize: (state) => ({
        favorites: state.favorites,
        recentlyViewed: state.recentlyViewed,
      }),
    }
  )
);
