import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PropertyType, UserRole } from '@/types/database';

export interface OnboardingPreferences {
  role: UserRole | null;
  intent: 'buy' | 'sell' | 'explore' | null;
  propertyType: PropertyType | null;
  budget: { min: number; max: number } | null;
  location: string | null;
  selectedPropertyId: string | null;
}

export interface PricingInsight {
  fairnessScore: number;
  suggestedPrice: number;
  currentPrice: number;
  savingsPotential: number;
  negotiationTip: string;
  comparablesCount: number;
}

interface OnboardingState {
  // Flow state
  currentStep: number;
  isCompleted: boolean;
  isLoading: boolean;

  // User preferences (collected during onboarding)
  preferences: OnboardingPreferences;

  // Variable reward data
  pricingInsight: PricingInsight | null;

  // Investment choices
  savedAlertZone: string | null;
  enabledNotifications: boolean;

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setPreferences: (prefs: Partial<OnboardingPreferences>) => void;
  setPricingInsight: (insight: PricingInsight | null) => void;
  setLoading: (loading: boolean) => void;
  setSavedAlertZone: (zone: string | null) => void;
  setEnabledNotifications: (enabled: boolean) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      // Initial state
      currentStep: 0,
      isCompleted: false,
      isLoading: false,

      preferences: {
        role: null,
        intent: null,
        propertyType: null,
        budget: null,
        location: null,
        selectedPropertyId: null,
      },

      pricingInsight: null,
      savedAlertZone: null,
      enabledNotifications: false,

      // Actions
      setStep: (step) => set({ currentStep: step }),

      nextStep: () => set((state) => ({
        currentStep: Math.min(state.currentStep + 1, 3)
      })),

      prevStep: () => set((state) => ({
        currentStep: Math.max(state.currentStep - 1, 0)
      })),

      setPreferences: (prefs) => set((state) => ({
        preferences: { ...state.preferences, ...prefs }
      })),

      setPricingInsight: (insight) => set({ pricingInsight: insight }),

      setLoading: (loading) => set({ isLoading: loading }),

      setSavedAlertZone: (zone) => set({ savedAlertZone: zone }),

      setEnabledNotifications: (enabled) => set({ enabledNotifications: enabled }),

      completeOnboarding: () => set({ isCompleted: true }),

      resetOnboarding: () => set({
        currentStep: 0,
        isCompleted: false,
        isLoading: false,
        preferences: {
          role: null,
          intent: null,
          propertyType: null,
          budget: null,
          location: null,
          selectedPropertyId: null,
        },
        pricingInsight: null,
        savedAlertZone: null,
        enabledNotifications: false,
      }),
    }),
    {
      name: 'pricewaze-onboarding',
      partialize: (state) => ({
        isCompleted: state.isCompleted,
        preferences: state.preferences,
      }),
    }
  )
);
