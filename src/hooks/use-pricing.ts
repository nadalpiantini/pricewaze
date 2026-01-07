import { useState, useCallback } from 'react';
import type { PricingAnalysis, OfferAdvice, ContractDraft } from '@/types/pricing';

export function usePricing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzePricing = useCallback(
    async (propertyId: string): Promise<PricingAnalysis | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/ai/pricing?property_id=${propertyId}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to analyze pricing');
        }

        return await response.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to analyze pricing';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getOfferAdvice = useCallback(
    async (offerId: string): Promise<OfferAdvice | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/ai/advice?offer_id=${offerId}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to get offer advice');
        }

        return await response.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get offer advice';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const generateContract = useCallback(
    async (offerId: string): Promise<ContractDraft | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/ai/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offer_id: offerId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to generate contract');
        }

        return await response.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate contract';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    analyzePricing,
    getOfferAdvice,
    generateContract,
  };
}
