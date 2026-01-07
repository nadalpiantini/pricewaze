import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Property } from '@/types/database';

interface ComparisonState {
  // Selected properties for comparison (max 3)
  selectedProperties: Property[];
  maxProperties: number;

  // Actions
  addProperty: (property: Property) => boolean; // Returns true if added, false if limit reached
  removeProperty: (propertyId: string) => void;
  clearComparison: () => void;
  isSelected: (propertyId: string) => boolean;
  canAddMore: () => boolean;
}

export const useComparisonStore = create<ComparisonState>()(
  persist(
    (set, get) => ({
      selectedProperties: [],
      maxProperties: 3,

      addProperty: (property) => {
        const { selectedProperties, maxProperties, isSelected } = get();

        // Don't add if already selected
        if (isSelected(property.id)) {
          return false;
        }

        // Don't add if limit reached
        if (selectedProperties.length >= maxProperties) {
          return false;
        }

        set({
          selectedProperties: [...selectedProperties, property],
        });

        return true;
      },

      removeProperty: (propertyId) => {
        set((state) => ({
          selectedProperties: state.selectedProperties.filter((p) => p.id !== propertyId),
        }));
      },

      clearComparison: () => {
        set({ selectedProperties: [] });
      },

      isSelected: (propertyId) => {
        return get().selectedProperties.some((p) => p.id === propertyId);
      },

      canAddMore: () => {
        const { selectedProperties, maxProperties } = get();
        return selectedProperties.length < maxProperties;
      },
    }),
    {
      name: 'pricewaze-comparison',
      partialize: (state) => ({
        selectedProperties: state.selectedProperties,
      }),
    }
  )
);


